module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  env: {
    es2021: true,
    browser: true,
    node: true,
  },
  plugins: ['react', '@typescript-eslint'],
  extends: [
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Enforce one component per file
    'react/no-multi-comp': ['error', { ignoreStateless: false, max: 1 }],
    // React 17+ / Vite doesn't need React in scope
    'react/react-in-jsx-scope': 'off',
  },
};
