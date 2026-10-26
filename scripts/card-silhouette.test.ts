import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { computeSilhouette, silhouetteModule } from './card-silhouette.ts';

describe('card silhouette', () => {
	it('matches card.glb and layout.ts; run `bun scripts/card-silhouette.ts` if not', async () => {
		const glb = new Uint8Array(
			await readFile(new URL('../src/lib/assets/card.glb', import.meta.url))
		);
		const committed = await readFile(
			new URL('../src/lib/cardSilhouette.ts', import.meta.url),
			'utf8'
		);
		expect(silhouetteModule(await computeSilhouette(glb))).toBe(committed);
	});
});
