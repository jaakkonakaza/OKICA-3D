import { expect, test } from '@playwright/test';

test('the demo renders the card without errors or third-party requests', async ({
	page,
	baseURL
}) => {
	const errors: string[] = [];
	const foreign: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (
			!url.href.startsWith(baseURL ?? '') &&
			url.protocol !== 'data:' &&
			url.protocol !== 'blob:'
		) {
			foreign.push(url.href);
		}
	});

	await page.goto('/demo');
	await expect(page.locator('canvas')).toBeVisible();
	await page.waitForTimeout(5_000);

	expect(errors).toEqual([]);
	expect(foreign).toEqual([]);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		'content',
		/^https?:\/\/.+\/open-graph-image\.jpg$/
	);
});

test('the 3D assets are preloaded and each downloaded once', async ({ page }) => {
	const assets = /\/_app\/immutable\/assets\/(card|sky|mplus|dm)\.[\w-]+\.(glb|webp|json)$/;
	const requested: string[] = [];
	const warnings: string[] = [];
	page.on('request', (request) => {
		if (assets.test(new URL(request.url()).pathname)) requested.push(request.url());
	});
	page.on('console', (message) => {
		if (message.type() === 'warning') warnings.push(message.text());
	});

	await page.goto('/demo');
	const preloads = await page
		.locator('link[rel="preload"]')
		.evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
	// Wait for Chromium to report unused preloads.
	await page.waitForTimeout(5_000);

	const assetPreloads = preloads.filter((href) => assets.test(new URL(href).pathname));
	expect(assetPreloads).toEqual([expect.stringMatching(/\/sky\.[\w-]+\.webp$/)]);

	expect(requested).toHaveLength(4);
	expect(new Set(requested).size).toBe(4);
	expect(warnings.filter((text) => /preload/i.test(text))).toEqual([]);
});

test('the card page needs the gate header', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(401);
	expect(response.headers()['cache-control']).toBe('private, no-store');
});

test('the card page ignores legacy identity headers', async ({ request }) => {
	const response = await request.get('/', { headers: { 'Remote-User': 'jaakko' } });
	expect(response.status()).toBe(401);
});

test('the health check answers without the gate header', async ({ request }) => {
	const response = await request.get('/healthz');
	expect(response.status()).toBe(200);
});

test('errors are shown inside the card shape', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(401);

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('401');
	await expect(alert).toContainText('サインインが必要です');

	const card = await page.locator('.skeleton path').boundingBox();
	const text = await alert.boundingBox();
	if (!card || !text) throw new Error('Missing card or message');
	expect(text.x).toBeGreaterThanOrEqual(card.x);
	expect(text.y).toBeGreaterThanOrEqual(card.y);
	expect(text.x + text.width).toBeLessThanOrEqual(card.x + card.width);
	expect(text.y + text.height).toBeLessThanOrEqual(card.y + card.height);

	await page.getByRole('link', { name: 'デモを見る' }).click();
	await expect(page).toHaveURL(/\/demo$/);
});

for (const asset of ['card', 'sky', 'mplus']) {
	test(`shows a retry action when the ${asset} asset fails`, async ({ page }) => {
		await page.route(new RegExp(`/${asset}\\.[\\w-]+\\.(glb|webp|json)$`), (route) =>
			route.abort()
		);
		await page.goto('/demo');
		await expect(page.getByRole('alert')).toContainText('カード情報を読み込めませんでした。');
		await expect(page.getByRole('button', { name: '再読み込み' })).toBeVisible();
	});
}

test('card values have a text equivalent with reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/demo');
	await expect(page).toHaveTitle('デモ | OKICA');
	await expect(page.locator('#canvas')).toHaveAttribute('data-card-ready', 'true', {
		timeout: 15_000
	});
	const status = page.getByRole('status');
	await expect(status).toContainText('OK001 7357 7357 7357', { timeout: 1000 });
	await expect(status.locator('dd')).toHaveText(['1234', '560', '500', '0']);
});
