# Contributing

## Development

1. Use Node.js 20 or newer.
2. Create a focused branch.
3. Run `npm ci`.
4. Add tests for every behavior change.
5. Run `npm run check` and `npm audit --audit-level=high`.
6. Keep examples synthetic and remove secrets before committing.

## Conventions

- TypeScript in strict mode.
- ESM modules and explicit `.js` extensions in source imports.
- Two-space indentation and Prettier formatting.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Deny by default at every trust boundary.
- Deterministic evaluation before model-generated explanation.
- No network request in unit tests or CI.

## Pull requests

Describe the threat or use case, the trust boundary affected, tests added, commands run, expected
output, and rollback. Documentation must match observed behavior.
