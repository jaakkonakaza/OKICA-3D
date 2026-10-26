<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import skyUrl from './assets/sky.webp';
	import CardError from './CardError.svelte';
	import CardShape from './CardShape.svelte';
	import Scene from './Scene.svelte';
	import type { Data } from './types';

	let { data, title = 'OKICA' }: { data: Data | Promise<Data>; title?: string } = $props();

	const MIN_LOADING_MS = 4000;

	let isDragging = $state(false);
	let dataFailed = $state(false);
	let sceneFailed = $state(false);
	const failed = $derived(dataFailed || sceneFailed);
	let loadedData = $state.raw<Data>();
	let cardReady = $state(false);
	let introStarted = false;
	let introTimer: ReturnType<typeof setTimeout> | undefined;
	const { promise: intro, resolve: finishIntro } = Promise.withResolvers<undefined>();

	$effect(() => {
		let cancelled = false;
		const active = () => !cancelled;
		void Promise.resolve(data)
			.then(async (loaded) => {
				if (!active()) return;
				dataFailed = false;
				await intro;
				if (active()) loadedData = loaded;
			})
			.catch((error: unknown) => {
				if (!active()) return;
				console.error('Loading the card data failed', error);
				dataFailed = true;
			});
		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		clearTimeout(introTimer);
	});
</script>

<svelte:head>
	<title>{title}</title>
	<!-- CORS matches ImageLoader. WebKit does not reuse fetch preloads. -->
	<link rel="preload" href={skyUrl} as="image" crossorigin="anonymous" />

	<meta property="og:image" content={`${page.url.origin}/open-graph-image.jpg`} />
</svelte:head>

<main
	id="canvas"
	aria-label="OKICA"
	data-card-ready={cardReady}
	onpointerdown={() => {
		isDragging = true;
	}}
	onpointerup={() => {
		isDragging = false;
	}}
	onpointercancel={() => {
		isDragging = false;
	}}
>
	{#if !failed}
		<svelte:boundary onerror={() => (sceneFailed = true)}>
			<Canvas dpr={[1, 2]} shadows={false}>
				<Scene
					data={loadedData}
					{isDragging}
					onreadychange={(ready: boolean) => {
						cardReady = ready;
						if (!ready || introStarted) return;
						introStarted = true;
						introTimer = setTimeout(
							() => {
								finishIntro(undefined);
							},
							prefersReducedMotion.current ? 0 : MIN_LOADING_MS
						);
					}}
				/>
			</Canvas>
		</svelte:boundary>
	{/if}

	<div class="sr-only" role="status">
		{#if loadedData && !failed}
			<p>{loadedData.cardNumber}</p>
			<dl>
				{#each loadedData.dataPoints as { title, value } (title)}
					<dt>{title}</dt>
					<dd>{value}</dd>
				{/each}
			</dl>
		{:else if !failed}
			カード情報を読み込んでいます。
		{/if}
	</div>

	<CardShape breathing hidden={cardReady || failed} />
	{#if failed}
		<CardError title="エラー" message={['カード情報を', '読み込めませんでした。']}>
			<button
				type="button"
				onclick={() => {
					location.reload();
				}}>再読み込み</button
			>
		</CardError>
	{/if}
</main>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	#canvas {
		position: relative;
		overflow: hidden;
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
