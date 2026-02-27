import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
	},
	{
		rules: {
			// Allow `any` in pragmatic cases (event handlers, catch blocks)
			'@typescript-eslint/no-explicit-any': 'warn',
			// Svelte reactive vars may look unused to ESLint
			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_|^\\$',
			}],
			// SvelteKit handles href resolution via its router
			'svelte/no-navigation-without-resolve': 'off',
			// Each-key is good practice but not critical for small static lists
			'svelte/require-each-key': 'warn',
			// Allow empty catch blocks
			'no-empty': ['warn', { allowEmptyCatch: true }],
			// Svelte 5 reactivity suggestions — follow gradually
			'svelte/prefer-writable-derived': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn',
		},
	},
	{
		// Scripts-specific overrides (scrapers use patterns that trigger false positives)
		files: ['scripts/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			}],
			// Counter initialization (`let found = 0`) triggers false positives
			'no-useless-assignment': 'off',
			// Intentional control char stripping in scrapers (JSON-LD cleanup)
			'no-control-regex': 'off',
		},
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'.vercel/',
			'dist/',
			'node_modules/',
			'scripts/node_modules/',
		],
	}
);
