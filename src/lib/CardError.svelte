<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardShape from './CardShape.svelte';

	let { title, message, children }: { title: string; message: string[]; children?: Snippet } =
		$props();

	const titleSize = $derived(
		/^\d+$/.test(title) ? undefined : `min(24cqh, ${String(96 / title.length)}cqw)`
	);
</script>

<CardShape>
	<div class="error" role="alert">
		<p class="title" style:font-size={titleSize}>{title}</p>
		<p class="message">
			{#each message as phrase, i (phrase)}{#if i > 0}<wbr />{/if}{phrase}{/each}
		</p>
		{@render children?.()}
	</div>
</CardShape>

<style>
	.error {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 4cqh;
		flex-grow: 1;
		align-self: stretch;
	}

	p {
		margin: 0;
	}

	.title {
		font-size: 24cqh;
		font-weight: 100;
		line-height: 1;
		white-space: nowrap;
	}

	.message {
		font-size: 5cqh;
		line-height: 1.5;
		word-break: keep-all;
		overflow-wrap: anywhere;
		flex-grow: 1;
		text-align: left;
	}

	.error :global(:is(a, button)) {
		font: inherit;
		font-size: 5cqh;
		color: inherit;
		text-decoration: underline;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		align-self: flex-end;
	}
</style>
