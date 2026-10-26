<script lang="ts">
	import { T, useLoader } from '@threlte/core';
	import { Text3DGeometry } from '@threlte/extras';
	import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
	import { onDestroy } from 'svelte';
	import { usePrecompile } from './precompile.svelte';
	import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
	import dmUrl from './assets/dm.json?url';
	import mplusUrl from './assets/mplus.json?url';
	import { DATA_POINT_TITLES, type Data } from './types';

	interface TextData {
		id: string;
		text: string;
		size: number;
		topOffset: number;
		mono?: boolean;
	}

	let { data }: { data?: Data } = $props();

	const titleSize = 0.1;
	const valueSize = 0.2;
	const cardNumberSize = 0.1;

	const textOffset = 0.35;
	const valueOffset = 0.6;
	const cardNumberOffset = 3.5;

	const left = -1;
	const top = 1.3 + valueOffset;

	const material = new MeshStandardMaterial({ color: 'black' });
	// The text group stays hidden, and so uncompiled, until the data arrives
	const precompileMesh = new Mesh(new PlaneGeometry(), material);
	usePrecompile(() => precompileMesh);

	const texts: TextData[] = $derived.by(() => {
		if (!data) return [];
		const { dataPoints, name, cardNumber } = data;

		const values = new Map(dataPoints.map(({ title, value }) => [title, value]));

		return [
			...DATA_POINT_TITLES.map((title, i) => ({
				id: title,
				text: values.get(title) ?? '',
				size: valueSize,
				topOffset: valueOffset + i * valueOffset
			})),
			{ id: 'name', text: name, size: cardNumberSize - 0.03, topOffset: cardNumberOffset - 0.15 },
			{
				id: 'cardNumber',
				text: cardNumber,
				size: cardNumberSize,
				topOffset: cardNumberOffset,
				mono: true
			}
		];
	});

	// The fonts contain a subset of glyphs. New characters require regenerated fonts.
	const fontLoader = useLoader(FontLoader);
	const dm = fontLoader.load(dmUrl);
	const mplus = fontLoader.load(mplusUrl);
	const dmError = dm.error;
	const mplusError = mplus.error;
	$effect(() => {
		if ($dmError) throw new Error('Card font failed to load', { cause: $dmError });
		if ($mplusError) throw new Error('Card font failed to load', { cause: $mplusError });
	});

	onDestroy(() => {
		precompileMesh.geometry.dispose();
		material.dispose();
	});
</script>

<T.Group visible={!!data}>
	<!-- Without a font, Text3DGeometry falls back to fetching one from a CDN -->
	{#if $mplus && $dm}
		{#each DATA_POINT_TITLES as text, i (text)}
			<T.Mesh position={[left, top - (textOffset + i * valueOffset), 0]} {material}>
				<Text3DGeometry {text} size={titleSize} depth={0.01} font={$mplus} />
			</T.Mesh>
		{/each}
		{#each texts as textData (textData.id)}
			<T.Mesh position={[left, top - textData.topOffset, 0]} {material}>
				<Text3DGeometry
					text={textData.text}
					size={textData.size}
					depth={0.01}
					font={textData.mono ? $dm : $mplus}
				/>
			</T.Mesh>
		{/each}
	{/if}
</T.Group>
