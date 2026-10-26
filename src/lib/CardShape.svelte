<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CARD_BOUNDS, CARD_SILHOUETTE } from './cardSilhouette';

	let {
		breathing = false,
		hidden = false,
		children
	}: { breathing?: boolean; hidden?: boolean; children?: Snippet } = $props();

	const [left, top, right, bottom] = CARD_BOUNDS;
	const percent = (value: number) => `${String(value / 10)}%`;
</script>

<div class={['skeleton', { hidden }]}>
	<svg viewBox="-500 -500 1000 1000" aria-hidden="true">
		<path class={{ breathing }} d={CARD_SILHOUETTE} />
	</svg>
	{#if children}
		<div
			class="content"
			style:left={percent(left + 500)}
			style:top={percent(top + 500)}
			style:width={percent(right - left)}
			style:height={percent(bottom - top)}
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.skeleton {
		--skeleton-base: #e4e0e5;
		--skeleton-highlight: #f3f1f4;
		--skeleton-text: #4a4350;
		position: absolute;
		top: 0;
		left: 50%;
		height: 100%;
		aspect-ratio: 1;
		transform: translateX(-50%);
		pointer-events: none;
		container-type: size;
	}

	.skeleton.hidden {
		visibility: hidden;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	path {
		fill: var(--skeleton-base);
	}

	path.breathing {
		animation: skeleton-breathe 1.6s ease-in-out infinite alternate;
	}

	@media (prefers-reduced-motion: reduce) {
		path.breathing {
			animation: none;
		}
	}

	@keyframes skeleton-breathe {
		to {
			fill: var(--skeleton-highlight);
		}
	}

	.content {
		position: absolute;
		box-sizing: border-box;
		padding: 6cqh 2.5cqh;
		container-type: size;
		display: flex;
		flex-direction: column;
		justify-content: start;
		align-items: center;
		text-align: center;
		color: var(--skeleton-text);
		font-family: system-ui, sans-serif;
		pointer-events: auto;
	}

	@media (prefers-color-scheme: dark) {
		.skeleton {
			--skeleton-base: #28232a;
			--skeleton-highlight: #3d373f;
			--skeleton-text: #d9d3dc;
		}
	}
</style>
