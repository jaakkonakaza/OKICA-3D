import { Hono } from 'hono';
import { cors } from 'hono/cors';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import type { Context } from 'hono';
import { cache } from './cache.js';

const COOKIE_PATH = path.resolve('okica-cookies.json');

interface Credentials {
	email: string;
	password: string;
	cardNumber: string;
}

interface Data {
	dataPoints: Array<{ title: string; value: string }>;
	name: string;
	cardNumber: string;
}

interface Error {
	status: number;
	message: string;
}

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Health check endpoint
app.get('/health', (c: Context) => c.json({ status: 'ok' }));

// Data loading endpoint with 2-minute cache
app.get('/data', async (c: Context) => {
	const apiKey = c.req.query('apiKey');
	if (!apiKey) {
		return c.json({ status: 400, message: 'No API key provided' }, 400);
	}

	// Generate cache key based on API key
	const cacheKey = `okica-data-${apiKey}`;

	// Try to get cached data
	const cachedData = cache.get(cacheKey);
	if (cachedData) {
		return c.json(cachedData);
	}

	const credentials = JSON.parse(process.env.CREDENTIALS || '{}');
	if (!credentials[apiKey]) {
		return c.json({ status: 400, message: 'Invalid API key' }, 400);
	}

	const { email, password, cardNumber } = credentials[apiKey] as Credentials;

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	try {
		const savedCookies = fs.existsSync(COOKIE_PATH)
			? JSON.parse(fs.readFileSync(COOKIE_PATH).toString())
			: {};
		if (savedCookies[apiKey] !== undefined) {
			await page.setCookie(...savedCookies[apiKey]);
			await page.goto('https://www.okica.jp/webservice/Account/PreRegistHome', {
				waitUntil: 'domcontentloaded'
			});
		} else {
			await page.goto('https://www.okica.jp/webservice/Account/Login', {
				waitUntil: 'domcontentloaded'
			});

			await page.evaluate(
				(email, password) => {
					(document.getElementById('MailAddress') as HTMLInputElement).value = email;
					(document.getElementById('Password') as HTMLInputElement).value = password;
					(document.querySelector('button[value="ログイン"]') as HTMLButtonElement).click();
				},
				email,
				password
			);

			await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

			const cookies = await page.cookies();
			const allCookies = fs.existsSync(COOKIE_PATH)
				? JSON.parse(fs.readFileSync(COOKIE_PATH).toString())
				: {};
			allCookies[apiKey] = cookies;
			fs.writeFileSync(COOKIE_PATH, JSON.stringify(allCookies));
		}

		await page.evaluate(() => {
			(
				document.querySelector('a[href="/webservice/History/ShowHistory"]') as HTMLAnchorElement
			).click();
		});

		await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

		const tableData = await page.evaluate(() => {
			const rows = document.querySelectorAll('.table tr');
			const data: Array<Array<string>> = [];
			for (const row of rows) {
				const cells = row.querySelectorAll('td');
				if (cells.length >= 2) {
					const key = cells[0].innerText.trim().replace('：', '');
					const value = cells[1].innerText.trim();
					data.push([key, value]);
				}
			}
			return data;
		});

		await browser.close();

		const dataPoints = tableData.map(([title, value]) => ({ title, value }));
		const responseData = {
			dataPoints,
			name: '',
			cardNumber
		};

		// Cache the response
		cache.set(cacheKey, responseData);

		return c.json(responseData);
	} catch (error) {
		await browser.close();
		return c.json(
			{
				status: 500,
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			500
		);
	}
});

export default app;
