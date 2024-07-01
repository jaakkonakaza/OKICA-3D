<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { Environment, interactivity, OrbitControls } from '@threlte/extras';
	import { spring } from 'svelte/motion';
	import Card from './Card.svelte';
	import Text from './Text.svelte';
	import type { Data } from './types';
	import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	interactivity();
	const scale = spring(0.7);

	const rot = spring(0, {
		stiffness: 0.1
	});
	let orbitControls: ThreeOrbitControls;
	const { stop } = useTask((delta) => {
		rot.update((value) => value + delta);
	});

	let textComponent: Text;
	let cardComponent: Card;
	export const load = (data: Data) => {
		textComponent.load(data);
		cardComponent.load();
		stop();
		rot.update(
			(value) => value - (value % (Math.PI * 2)) + orbitControls.object.rotation.y + Math.PI * 6
		);
		scale.set(1);
		return '';
	};
</script>

<T.PerspectiveCamera makeDefault position={[0, 5, 0]}>
	<OrbitControls
		on:create={({ ref }) => {
			orbitControls = ref;
		}}
		enableDamping
		enableZoom={false}
		maxPolarAngle={Math.PI / 2}
		minPolarAngle={Math.PI / 2}
	/>
</T.PerspectiveCamera>
<ambientLight intensity={Math.PI} />
<T.DirectionalLight position={[0, 10, 10]} intensity={2} />
<Environment isBackground={false} files="sky4k.jpg" />
<T.Group rotation.y={$rot} scale={$scale}>
	<T.Mesh>
		<Card bind:this={cardComponent} />
	</T.Mesh>
	<Text bind:this={textComponent} />
</T.Group>
