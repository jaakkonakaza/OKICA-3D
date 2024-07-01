import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { PageServerLoad } from './$types';
import type { Data, DataPoint } from './types';
import { env } from '$env/dynamic/private';

const COOKIE_PATH = path.resolve('okica-cookies.json');

export const load: PageServerLoad = async ({ url }) => {
	return {
		table: loadData(url)
	};
};

interface Credentials {
	email: string;
	password: string;
	cardNumber: string;
}

interface Error {
	status: number;
	message: string;
}

const loadData = async (url: URL): Promise<Data | Error> => {
	const apiKey = url.searchParams.get('apiKey');
	if (apiKey === null) {
		return { status: 400, message: 'No API key provided' };
	}

	const credentials = JSON.parse(env.CREDENTIALS);
	env.COOKIES = '{"test": "test"}';
	if (!credentials[apiKey]) {
		return { status: 400, message: 'Invalid API key' };
	}

	const { email, password, cardNumber } = credentials[apiKey] as Credentials;

	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();

	try {
		const savedCookies = fs.existsSync(COOKIE_PATH)
			? JSON.parse(fs.readFileSync(COOKIE_PATH).toString())
			: {};
		if (savedCookies[apiKey] !== undefined) {
			await page.setCookie(...savedCookies[apiKey]);

			// Navigate to PreRegistHome
			await page.goto('https://www.okica.jp/webservice/Account/PreRegistHome', {
				waitUntil: 'domcontentloaded'
			});
		} else {
			// Load the login page
			await page.goto('https://www.okica.jp/webservice/Account/Login', {
				waitUntil: 'domcontentloaded'
			});

			// Fill in the login form and submit it
			await page.evaluate(
				(email, password) => {
					(document.getElementById('MailAddress') as HTMLInputElement).value = email;
					(document.getElementById('Password') as HTMLInputElement).value = password;
					(document.querySelector('button[value="ログイン"]') as HTMLButtonElement).click();
				},
				email,
				password
			);

			// Wait for navigation after login
			await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

			// Save cookies
			const cookies = await page.cookies();
			const allCookies = fs.existsSync(COOKIE_PATH)
				? JSON.parse(fs.readFileSync(COOKIE_PATH).toString())
				: {};
			allCookies[apiKey] = cookies;

			// fs.writeFileSync(COOKIE_PATH, JSON.stringify(allCookies)); TODO use database
		}
		// Click the history link
		await page.evaluate(() => {
			(
				document.querySelector('a[href="/webservice/History/ShowHistory"]') as HTMLAnchorElement
			).click();
		});

		// Wait for navigation to the history page
		await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

		// Extract the table data
		const tableData = await page.evaluate(() => {
			const rows = document.querySelectorAll('.table tr');
			const data: Array<Array<string>> = [];
			rows.forEach((row) => {
				const cells = row.querySelectorAll('td');
				if (cells.length >= 2) {
					const key = cells[0].innerText.trim().replace('：', '');
					const value = cells[1].innerText.trim();
					data.push([key, value]);
				}
			});
			return data;
		});

		await browser.close();

		const dataPoints: DataPoint[] = tableData.map(([title, value]) => ({ title, value }));
		const name = '';
		return {
			dataPoints,
			name,
			cardNumber
		};
	} catch (e: any) {
		await browser.close();
		return { status: 500, message: e.message };
	}
};
