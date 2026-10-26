import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'test-results/', 'playwright-report/']
	},
	js.configs.recommended,
	ts.configs.strictTypeChecked,
	ts.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			'svelte/block-lang': ['error', { script: 'ts' }],
			'svelte/button-has-type': 'error',
			'svelte/require-each-key': 'error',
			'svelte/prefer-svelte-reactivity': 'error'
		}
	},
	{
		// Plain JS config files are outside the TypeScript project
		files: ['**/*.js'],
		extends: [ts.configs.disableTypeChecked]
	}
);
