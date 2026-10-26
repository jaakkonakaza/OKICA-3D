import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

// Perspective adds up to 20% to the height. Loading scales the card from 0.7 to 1.
const cardHeight = async (page: Page) => {
	const { data, width, height } = PNG.sync.read(await page.screenshot());
	let rows = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const distance = (data[i] ?? 0) + Math.abs(255 - (data[i + 1] ?? 0)) + (data[i + 2] ?? 0);
			if (distance > 128) {
				rows++;
				break;
			}
		}
	}
	return rows;
};

test('the intro spin lasts 4 s from when the card starts spinning, however slow the model', async ({
	page
}) => {
	test.setTimeout(60_000);
	const { promise: held, resolve: release } = Promise.withResolvers<undefined>();
	await page.route(/\/card\.[\w-]+\.glb$/, async (route) => {
		await held;
		await route.continue();
	});
	await page.clock.install();
	await page.goto('/demo');
	await page.waitForTimeout(500);
	await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5000);
	await page.addStyleTag({
		content: 'body { background: rgb(0, 255, 0) !important; } .skeleton { display: none; }'
	});

	await page.clock.fastForward(6000);
	const model = page.waitForResponse(/\/card\.[\w-]+\.glb$/);
	release(undefined);
	await model;

	const canvas = page.locator('#canvas');
	for (let frame = 0; frame < 120; frame++) {
		if ((await canvas.getAttribute('data-card-ready')) === 'true') break;
		await page.clock.runFor(16);
	}
	await expect(canvas).toHaveAttribute('data-card-ready', 'true');
	const start = await cardHeight(page);
	expect(start).toBeGreaterThan(0);

	await page.clock.fastForward(3800);
	await page.clock.runFor(100);
	expect(await cardHeight(page)).toBeLessThan(start * 1.22);

	await page.clock.fastForward(300);
	for (let step = 0; step < 6; step++) await page.clock.fastForward(250);
	await page.clock.runFor(50);
	expect(await cardHeight(page)).toBeGreaterThan(start * 1.35);
});
