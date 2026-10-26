import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PLAYWRIGHT_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: 'test',
	forbidOnly: !!process.env.CI,
	use: { baseURL },

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: 'bun run build && bun build/index.js',
		env: { HOST: '127.0.0.1', PORT },
		url: `${baseURL}/healthz`,
		reuseExistingServer: !process.env.CI
	}
});
