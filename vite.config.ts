import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, loadEnv } from 'vite';
import { threlteMinify } from 'threlte-minify';

export default defineConfig(({ mode }) => {
	const { DEV_ALLOWED_HOSTS } = loadEnv(mode, process.cwd(), 'DEV_');

	return {
		plugins: [
			threlteMinify(),
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter()
			})
		],
		server: {
			allowedHosts: DEV_ALLOWED_HOSTS?.split(',').map((host) => host.trim())
		},
		test: {
			include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
		}
	};
});
