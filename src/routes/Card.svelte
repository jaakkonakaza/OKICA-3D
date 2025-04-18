<script module lang="ts">
	import type * as THREE from 'three';

	import type { Snippet } from 'svelte';
	import { T, type Props } from '@threlte/core';
	import { useGltf, useSuspense, useDraco } from '@threlte/extras';

	type GLTFResult = {
		nodes: {
			Plane_1: THREE.Mesh;
			Plane_2: THREE.Mesh;
		};
		materials: {
			Front: THREE.MeshStandardMaterial;
			Back: THREE.MeshStandardMaterial;
		};
	};

	const loadCard = () => {
		const suspend = useSuspense();
		return suspend(useGltf<GLTFResult>('/card-transformed.glb', { dracoLoader: useDraco() }));
	};

	export const preload = async () => {
		await loadCard();
	};
</script>

<script lang="ts">
	let {
		fallback,
		error,
		children,
		ref = $bindable()
	}: Props<THREE.Group> & {
		ref?: THREE.Group;
		children?: Snippet<[{ ref: THREE.Group }]>;
		fallback?: Snippet;
		error?: Snippet<[{ error: Error }]>;
	} = $props();

	const center = (ref: THREE.Mesh) => {
		ref.geometry.computeBoundingBox();
		const max = ref.geometry.boundingBox?.max?.z || 0;
		const min = ref.geometry.boundingBox?.min?.z || 0;
		const center = (max + min) / 2;
		ref.geometry.translate(0, 0, -center);
	};
	const gltf = loadCard();
	let loaded = $state(false);
	export const load = () => {
		loaded = true;
	};
</script>

<T.Group bind:ref dispose={false}>
	{#await gltf}
		{@render fallback?.()}
	{:then gltf}
		<T.Group
			rotation={[Math.PI / 2, 0, 0]}
			oncreate={() => {
				gltf.materials.Front.roughness = 0.2; // Make the front material more shiny
			}}
		>
			<T.Mesh
				oncreate={(ref) => center(ref)}
				castShadow
				receiveShadow
				geometry={gltf.nodes.Plane_1.geometry}
				material={loaded ? gltf.materials.Front : gltf.materials.Back}
			/>
			<T.Mesh
				oncreate={(ref) => center(ref)}
				castShadow
				receiveShadow
				geometry={gltf.nodes.Plane_2.geometry}
				material={gltf.materials.Back}
			/>
		</T.Group>
	{:catch err}
		{@render error?.({ error: err })}
	{/await}

	{#if ref}
		{@render children?.({ ref })}
	{/if}
</T.Group>
