<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CardError from '#lib/CardError.svelte';

	const MESSAGES: Record<number, string[]> = {
		401: ['サインインが', '必要です。'],
		403: ['このアカウントには', 'OKICAが', '登録されていません。'],
		404: ['ページが', '見つかりません。']
	};

	const message = $derived(MESSAGES[page.status] ?? ['問題が', '発生しました。']);
	const showDemo = $derived(page.status < 500 && page.url.pathname !== '/demo');
	const showReload = $derived(page.status >= 500);
</script>

<svelte:head>
	<title>{page.status} | OKICA</title>
</svelte:head>

<main>
	<CardError title={String(page.status)} {message}>
		{#if showDemo}
			<a href={resolve('/demo')}>デモを見る</a>
		{:else if showReload}
			<button
				type="button"
				onclick={() => {
					location.reload();
				}}>再読み込み</button
			>
		{/if}
	</CardError>
</main>

<style>
	main {
		position: relative;
		overflow: hidden;
		height: 100vh;
	}

	@media (max-width: 768px) {
		main {
			height: 100svh;
		}
	}
</style>
