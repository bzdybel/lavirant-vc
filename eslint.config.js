import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules', 'dist']
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react: reactPlugin,
      '@typescript-eslint': tsPlugin
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'react/react-in-jsx-scope': 'off',
      // `no-undef` doesn't understand TS types and DOM lib identifiers
      'no-undef': 'off',
      // Use TypeScript version which understands type-only parameters
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  }
];
