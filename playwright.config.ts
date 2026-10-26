import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PLAYWRIGHT_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${PORT}`;
const linuxCI = !!process.env.CI && process.platform === 'linux';

export default defineConfig({
	testDir: 'test',
	forbidOnly: !!process.env.CI,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'list',
	use: { baseURL },

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				...(linuxCI
					? {
							headless: false,
							launchOptions: {
								args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist']
							}
						}
					: {})
			}
		},
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: 'bun run build && bun build/index.js',
		env: { HOST: '127.0.0.1', PORT },
		url: `${baseURL}/healthz`,
		reuseExistingServer: !process.env.CI
	}
});
