import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

// Two backgrounds let pixel colour changes reveal foreground coverage.
const BACKGROUNDS = ['rgb(0, 255, 0)', 'rgb(255, 0, 255)'] as const;

const coverage = async (page: Page, css: string) => {
	const style = await page.addStyleTag({ content: '/* coverage */' });
	const shots: Buffer[] = [];
	for (const background of BACKGROUNDS) {
		await style.evaluate(
			(el, content) => (el.textContent = content),
			`body { background: ${background} !important; } ${css}`
		);
		shots.push(await page.screenshot());
	}
	await style.evaluate((el) => el.parentNode?.removeChild(el));

	const [a, b] = shots.map((shot) => PNG.sync.read(shot).data);
	if (!a || !b) throw new Error('Missing screenshot');
	const out = new Float64Array(a.length / 4);
	for (let i = 0; i < out.length; i++) {
		let change = 0;
		for (let c = 0; c < 3; c++) change += Math.abs((a[i * 4 + c] ?? 0) - (b[i * 4 + c] ?? 0));
		out[i] = 1 - change / (3 * 255);
	}
	return out;
};

const iou = (a: Float64Array, b: Float64Array) => {
	let inter = 0;
	let union = 0;
	for (let i = 0; i < a.length; i++) {
		inter += Math.min(a[i] ?? 0, b[i] ?? 0);
		union += Math.max(a[i] ?? 0, b[i] ?? 0);
	}
	return inter / union;
};

// At 1x, multisampling rounding nearly exhausts the 0.1% tolerance.
test.use({ deviceScaleFactor: 2 });

for (const viewport of [
	{ width: 800, height: 1000 },
	{ width: 390, height: 844 }
]) {
	test(`the skeleton matches the card's outline at ${String(viewport.width)}x${String(viewport.height)}`, async ({
		page
	}) => {
		test.setTimeout(60_000);
		await page.setViewportSize(viewport);
		const { promise: held, resolve: release } = Promise.withResolvers<undefined>();
		await page.route(/\/card\.[\w-]+\.glb$/, async (route) => {
			await held;
			await route.continue();
		});
		await page.clock.install();
		await page.goto('/demo');
		await page.waitForTimeout(500);
		await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5000);
		const model = page.waitForResponse(/\/card\.[\w-]+\.glb$/);
		release(undefined);
		await model;

		const canvas = page.locator('#canvas');
		let card: Float64Array | undefined;
		for (let frame = 0; frame < 120 && !card; frame++) {
			await page.clock.runFor(16);
			const shot = await coverage(page, '.skeleton { display: none; }');
			if (shot.some((v) => v > 0.5)) {
				expect(await canvas.getAttribute('data-card-ready')).toBe('false');
				card = shot;
			}
		}
		if (!card) throw new Error('The card never rendered');

		const skeleton = await coverage(
			page,
			'canvas { visibility: hidden; } .skeleton { opacity: 1 !important; visibility: visible !important; } .skeleton path { fill: #000 !important; }'
		);

		const match = iou(card, skeleton);
		test.info().annotations.push({ type: 'iou', description: match.toFixed(5) });
		expect(match).toBeGreaterThanOrEqual(0.999);
	});
}
