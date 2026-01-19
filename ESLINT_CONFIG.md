# ESLint & Prettier Configuration

This project uses ESLint for linting and Prettier for code formatting.

## Setup

The following configuration files have been created:

- `.eslintrc.json` - ESLint configuration with recommended rules
- `.prettierrc.json` - Prettier formatting configuration
- `.eslintignore` - Files/folders to ignore during linting
- `.prettierignore` - Files/folders to ignore during formatting
- `.vscode/settings.json` - VS Code settings for format on save

## Features

✅ **Format on Save** - Code is automatically formatted when you save a file
✅ **ESLint Rules** - Common linting rules enforced:
  - Consistent code style (2-space indentation)
  - Double quotes for strings
  - Semicolons required
  - Consistent spacing and formatting
  - React and TypeScript support

✅ **Auto-fix on Save** - ESLint issues are automatically fixed when possible

## VS Code Extensions Required

For the best experience, install these extensions:

1. **ESLint** - by Microsoft
   - ID: `dbaeumer.vscode-eslint`
   - Provides real-time linting feedback

2. **Prettier** - by Prettier
   - ID: `esbenp.prettier-vscode`
   - Handles code formatting

You can install them via:
```
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

Or search for them in VS Code Extensions (Ctrl+Shift+X)

## Rules Overview

### Key Rules:
- **indent**: 2 spaces
- **linebreak-style**: Unix (LF)
- **quotes**: Double quotes required
- **semi**: Semicolons required
- **no-unused-vars**: Warns about unused variables (use `_` prefix to ignore)
- **no-console**: Warns about console usage (except warn/error)
- **eqeqeq**: Requires === or !== instead of == or !=
- **no-var**: Requires let/const instead of var
- **prefer-const**: Prefers const over let when possible

### React & TypeScript:
- React Hooks rules enforced
- TypeScript types validated
- JSX properly formatted

## Manual Commands

You can also run linting/formatting manually:

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

## Customization

To modify rules, edit `.eslintrc.json` and `.prettierrc.json`. After changes:
1. Reload VS Code window (Cmd+Shift+P → "Developer: Reload Window")
2. Or restart VS Code

## Common Issues

**Issues not auto-fixing?**
- Make sure ESLint and Prettier extensions are installed
- Check that `.vscode/settings.json` is configured correctly
- Reload VS Code window

**Conflicts between ESLint and Prettier?**
- The configuration uses Prettier for formatting and ESLint for linting
- Prettier handles spacing, indentation, quotes
- ESLint handles code quality rules
