<script lang="ts">
	import Viewer from '#lib/Viewer.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Viewer data={data.data} />
