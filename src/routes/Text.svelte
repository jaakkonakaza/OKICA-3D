<script lang="ts">
	import { T, useLoader } from '@threlte/core';
	import { Text3DGeometry } from '@threlte/extras';
	import type { Data } from './types';
	import { FontLoader } from 'three/examples/jsm/Addons.js';
	interface TextData {
		text: string;
		size: number;
		topOffset: number;
		mono?: boolean;
	}

	let texts: TextData[] = [];

	const titleSize = 0.1;
	const valueSize = 0.2;
	const cardNumberSize = 0.1;

	const textOffset = 0.35;
	const valueOffset = 0.6;
	const cardNumberOffset = 3.5;

	const left = -1;
	const top = 1.3 + valueOffset;

	let group: any;

	export const load = (data: Data) => {
		const { dataPoints, name, cardNumber } = data;

		group.visible = true;

		texts = [
			...dataPoints.flatMap(({ value }, i) => [
				// { text: title, size: titleSize, topOffset: textOffset + i * valueOffset }, // Skipped for now
				{ text: value, size: valueSize, topOffset: valueOffset + i * valueOffset }
			]),
			{ text: name, size: cardNumberSize - 0.03, topOffset: cardNumberOffset - 0.15 },
			{ text: cardNumber, size: cardNumberSize, topOffset: cardNumberOffset, mono: true }
		];

		console.log(texts);
	};
	const dm = useLoader(FontLoader).load('dm.json');
	const mplus = useLoader(FontLoader).load('mplus.json');

	// Pre-rendered to speed up loading
	const dataPointTitles = ['残額', '有効ポイント', '還元可能ポイント', '当月失効予定ポイント'];
</script>

<T.Group
	on:create={({ ref }) => {
		group = ref;
		ref.visible = false;
	}}
>
	{#each dataPointTitles as text, i}
		<T.Mesh
			on:create={({ ref }) => ref.position.set(left, top - (textOffset + i * valueOffset), 0)}
		>
			<Text3DGeometry {text} size={titleSize} depth={0.01} font={$mplus} />
			<T.MeshStandardMaterial color={'black'} />
		</T.Mesh>
	{/each}
	{#each texts as textData}
		<T.Mesh on:create={({ ref }) => ref.position.set(left, top - textData.topOffset, 0)}>
			<Text3DGeometry
				text={textData.text}
				size={textData.size}
				depth={0.01}
				font={textData.mono ? $dm : $mplus}
			/>
			<T.MeshStandardMaterial color={'black'} />
		</T.Mesh>
	{/each}
</T.Group>
