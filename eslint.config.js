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
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'node_modules/',
			'scripts/node_modules/',
		],
	}
);
