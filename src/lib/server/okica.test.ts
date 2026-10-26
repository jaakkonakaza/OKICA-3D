import { afterEach, describe, expect, it, vi } from 'vitest';
import { absorb, fetchDataPoints, parseTable } from './okica.ts';

const page = (rows: [string, string][]) =>
	`<table class="table">${rows.map(([k, v]) => `<tr><td>${k}：</td><td>${v}</td></tr>`).join('')}</table>`;

const FULL = page([
	['残額', '1,234'],
	['有効ポイント', '56'],
	['還元可能ポイント', '7'],
	['当月失効予定ポイント', '0']
]);

const withCookies = (cookies: string[], init: ResponseInit = {}, body = '') => {
	const headers = new Headers();
	for (const c of cookies) headers.append('set-cookie', c);
	return new Response(body, { ...init, headers });
};

describe('absorb', () => {
	it('stores name=value pairs and ignores attributes', () => {
		const jar = new Map<string, string>();
		absorb(jar, withCookies(['a=1; Path=/; HttpOnly', 'b=x=y; Secure']));
		expect([...jar]).toEqual([
			['a', '1'],
			['b', 'x=y']
		]);
	});

	it('skips a cookie without a name', () => {
		const jar = new Map<string, string>();
		absorb(jar, withCookies(['novalue', '=orphan']));
		expect(jar.size).toBe(0);
	});

	it('drops cookies the server clears', () => {
		const jar = new Map([
			['a', '1'],
			['b', '2'],
			['c', '3']
		]);
		absorb(
			jar,
			withCookies(['a=; Path=/', 'b=2; Max-Age=0', 'c=3; Expires=Thu, 01 Jan 1970 00:00:00 GMT'])
		);
		expect(jar.size).toBe(0);
	});
});

describe('parseTable', () => {
	it('reads the expected title/value rows', () => {
		expect(parseTable(FULL)).toEqual([
			{ title: '残額', value: '1,234' },
			{ title: '有効ポイント', value: '56' },
			{ title: '還元可能ポイント', value: '7' },
			{ title: '当月失効予定ポイント', value: '0' }
		]);
	});

	it('ignores history rows with duplicate titles and normalizes balance rows', () => {
		const html =
			FULL +
			page([
				['利用日', '2026/10/25'],
				['利用日', '2026/10/24'],
				['残額', '2,345']
			]);
		expect(parseTable(html)).toEqual([
			{ title: '残額', value: '2,345' },
			{ title: '有効ポイント', value: '56' },
			{ title: '還元可能ポイント', value: '7' },
			{ title: '当月失効予定ポイント', value: '0' }
		]);
	});

	it('throws when an expected row is missing, e.g. a login page came back', () => {
		expect(() => parseTable('<form>login</form>')).toThrow(/missing 残額/);
		expect(() => parseTable(page([['残額', '1']]))).toThrow(/missing 有効ポイント/);
	});
});

describe('fetchDataPoints', () => {
	const fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	afterEach(() => fetchMock.mockReset());

	const loginPage = () =>
		withCookies(
			['session=s1; Path=/'],
			{ status: 200 },
			'<input name="__RequestVerificationToken" value="tok">'
		);

	it('reuses a valid auth cookie without logging in', async () => {
		fetchMock.mockResolvedValueOnce(new Response(FULL, { status: 200 }));
		const result = await fetchDataPoints('e', 'p', 'old');
		expect(result.auth).toBe('old');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toMatch(/ShowHistory$/);
	});

	it('logs in again when the session has expired (any redirect)', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response(null, { status: 303 }))
			.mockResolvedValueOnce(loginPage())
			.mockResolvedValueOnce(withCookies(['.ASPXAUTH=fresh; Path=/'], { status: 302 }))
			.mockResolvedValueOnce(new Response(FULL, { status: 200 }));

		const result = await fetchDataPoints('me@example.com', 'secret', 'old');

		expect(result.auth).toBe('fresh');
		const post = fetchMock.mock.calls[2]?.[1];
		expect(post?.method).toBe('POST');
		expect(new Headers(post?.headers).get('cookie')).toBe('session=s1');
		const body = post?.body as URLSearchParams;
		expect(body.get('MailAddress')).toBe('me@example.com');
		expect(body.get('__RequestVerificationToken')).toBe('tok');
	});

	it('fails when the login form comes back instead of a redirect', async () => {
		fetchMock
			.mockResolvedValueOnce(loginPage())
			.mockResolvedValueOnce(new Response('<form>wrong password</form>', { status: 200 }));
		await expect(fetchDataPoints('e', 'wrong', undefined)).rejects.toThrow('Login failed (200)');
	});

	it('gives every request a timeout', async () => {
		fetchMock.mockResolvedValueOnce(new Response(FULL, { status: 200 }));
		await fetchDataPoints('e', 'p', 'old');
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});
});
