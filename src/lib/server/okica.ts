import { parse } from 'node-html-parser';
import { DATA_POINT_TITLES } from '#lib/types.ts';

const BASE = 'https://www.okica.jp/webservice';
const AUTH_COOKIE = '.ASPXAUTH';
// ShowHistory returns 500 unless the request looks like it came from the home page
const HISTORY_REFERER = `${BASE}/Account/PreRegistHome`;

const TIMEOUT_MS = 10_000;

type Jar = Map<string, string>;

const cookieHeader = (jar: Jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

const okicaFetch = (path: string, init: RequestInit = {}) =>
	fetch(`${BASE}${path}`, { redirect: 'manual', ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

const isRedirect = (res: Response) => res.status >= 300 && res.status < 400;

export function absorb(jar: Jar, res: Response) {
	for (const cookie of res.headers.getSetCookie()) {
		const [pair = '', ...attributes] = cookie.split(';');
		const i = pair.indexOf('=');
		if (i <= 0) continue;
		const name = pair.slice(0, i).trim();
		const value = pair.slice(i + 1).trim();
		const expired = attributes.some((a) => {
			const [key = '', val = ''] = a.split('=').map((s) => s.trim().toLowerCase());
			return (
				(key === 'max-age' && Number(val) <= 0) ||
				(key === 'expires' && Date.parse(val) < Date.now())
			);
		});
		if (expired || value === '') jar.delete(name);
		else jar.set(name, value);
	}
}

async function login(email: string, password: string): Promise<string> {
	const jar: Jar = new Map();

	const page = await okicaFetch('/Account/Login', { redirect: 'follow' });
	absorb(jar, page);
	const token = parse(await page.text())
		.querySelector('input[name="__RequestVerificationToken"]')
		?.getAttribute('value');
	if (!token) throw new Error('Login token not found');

	const res = await okicaFetch('/Account/Login', {
		method: 'POST',
		headers: {
			cookie: cookieHeader(jar),
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			__RequestVerificationToken: token,
			MailAddress: email,
			Password: password,
			RememberMe: 'true'
		})
	});
	absorb(jar, res);

	// A successful login redirects. A failed login returns the form with status 200.
	const auth = jar.get(AUTH_COOKIE);
	if (!isRedirect(res) || !auth) throw new Error(`Login failed (${String(res.status)})`);
	return auth;
}

async function fetchHistoryPage(auth: string): Promise<string | null> {
	const res = await okicaFetch('/History/ShowHistory', {
		headers: { cookie: `${AUTH_COOKIE}=${auth}`, referer: HISTORY_REFERER }
	});
	if (isRedirect(res)) return null;
	if (res.status !== 200) throw new Error(`History page returned ${String(res.status)}`);
	return res.text();
}

export function parseTable(html: string) {
	const values = new Map<string, string>();
	for (const row of parse(html).querySelectorAll('.table tr')) {
		const [title, value] = row.querySelectorAll('td');
		if (title && value) {
			values.set(title.text.trim().replace('：', ''), value.text.trim());
		}
	}

	const missing = DATA_POINT_TITLES.filter((title) => !values.has(title));
	if (missing.length > 0) throw new Error(`History page is missing ${missing.join(', ')}`);
	return DATA_POINT_TITLES.map((title) => ({ title, value: values.get(title) ?? '' }));
}

export async function fetchDataPoints(email: string, password: string, auth: string | undefined) {
	if (auth) {
		const html = await fetchHistoryPage(auth);
		if (html !== null) return { dataPoints: parseTable(html), auth };
	}

	const fresh = await login(email, password);
	const html = await fetchHistoryPage(fresh);
	if (html === null) throw new Error('Session rejected right after login');
	return { dataPoints: parseTable(html), auth: fresh };
}
