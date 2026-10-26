<script lang="ts">
	import { Mesh } from 'three';
	import type * as THREE from 'three';
	import { T } from '@threlte/core';
	import { useGltf } from '@threlte/extras';
	import cardUrl from './assets/card.glb?url';
	import { CARD_ROTATION_X } from './layout';
	import { usePrecompile } from './precompile.svelte';

	interface GLTFResult {
		nodes: {
			Plane_1: THREE.Mesh;
			Plane_2: THREE.Mesh;
		};
		materials: {
			Front: THREE.MeshStandardMaterial;
			Back: THREE.MeshStandardMaterial;
		};
	}

	const center = (ref: THREE.Mesh) => {
		ref.geometry.computeBoundingBox();
		const max = ref.geometry.boundingBox?.max.z ?? 0;
		const min = ref.geometry.boundingBox?.min.z ?? 0;
		ref.geometry.translate(0, 0, -(max + min) / 2);
	};

	let { loaded = false, onready }: { loaded?: boolean; onready?: () => void } = $props();

	const gltf = useGltf<GLTFResult>(cardUrl);
	const gltfError = gltf.error;

	// Wait for the first rendered frame, including shader compilation.
	$effect(() => {
		if ($gltfError) throw new Error('Card model failed to load', { cause: $gltfError });
		if (!$gltf) return;
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => onready?.());
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	});

	const LOADING_FRONT_SHADE = 0.38;
	const loadingFront = $derived.by(() => {
		if (!$gltf) return undefined;
		const material = $gltf.materials.Back.clone();
		material.color.multiplyScalar(LOADING_FRONT_SHADE);
		return material;
	});
	$effect(() => {
		const material = loadingFront;
		return () => material?.dispose();
	});

	usePrecompile(() =>
		$gltf ? new Mesh($gltf.nodes.Plane_1.geometry, $gltf.materials.Front) : undefined
	);
</script>

<!-- useGltf caches the loaded model, so it must survive this component unmounting -->
<T.Group dispose={false}>
	{#if $gltf}
		<T.Group
			rotation={[CARD_ROTATION_X, 0, 0]}
			oncreate={() => {
				$gltf.materials.Front.roughness = 0.2;
			}}
		>
			<T.Mesh
				oncreate={center}
				geometry={$gltf.nodes.Plane_1.geometry}
				material={loaded ? $gltf.materials.Front : loadingFront}
			/>
			<T.Mesh
				oncreate={center}
				geometry={$gltf.nodes.Plane_2.geometry}
				material={$gltf.materials.Back}
			/>
		</T.Group>
	{/if}
</T.Group>
