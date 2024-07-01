<script lang="ts">
	import { Canvas } from '@threlte/core';
	import Scene from './Scene.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	export let data: PageData;

	let sceneComponent: Scene;

	let errorMessage: string | undefined;

	onMount(async () => {
		const table = await data.table;
		if ('message' in table) {
			errorMessage = table.message;
		} else {
			sceneComponent.load(table);
		}
	});
</script>

<svelte:head>
	<title>OKICA</title>
	<style>
		body {
			margin: 0;
			padding: 0;
		}
		html {
			user-select: none !important;
		}
	</style>
</svelte:head>

{#if errorMessage === undefined}
	<div id="canvas">
		<Canvas>
			<Scene bind:this={sceneComponent} />
		</Canvas>
	</div>
{:else}
	<p>{errorMessage}</p>
{/if}

<style>
	#canvas {
		width: 100%;
		height: 100svh;
		padding: 0;
		margin: 0;
	}
</style>
