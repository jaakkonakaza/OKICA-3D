<script lang="ts">
	import { Canvas } from '@threlte/core';
	import Scene from './Scene.svelte';
	import { onMount, tick } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let sceneComponent: Scene | null = $state(null);

	let isDragging = $state(false);

	onMount(async () => {
		const loaded = await data.data;

		await tick();

		if (sceneComponent) {
			sceneComponent.load(loaded!);
		}
	});
</script>

<svelte:head>
	<title>OKICA</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			background-color: #ffffff;
		}

		@media (prefers-color-scheme: dark) {
			body {
				background-color: #141114;
			}
		}
		html {
			user-select: none !important;
		}
	</style>
</svelte:head>

<div
	id="canvas"
	onpointerdown={() => {
		isDragging = true;
	}}
	onpointerup={() => {
		isDragging = false;
	}}
>
	<Canvas>
		<Scene bind:this={sceneComponent} {isDragging} />
	</Canvas>
</div>

<style>
	#canvas {
		width: 100%;
		height: 100vh;
		padding: 0;
		margin: 0;
	}

	@media (max-width: 768px) {
		#canvas {
			height: 100svh;
		}
	}
</style>
