# Security Policy

## Supported versions

The project is pre-release. Security fixes are applied to the latest version on `main`.

## Reporting

Do not open a public issue for a suspected vulnerability involving secret disclosure, path-boundary
bypass, policy bypass, or unintended tool execution. Use GitHub private vulnerability reporting.

Include the affected commit, reproduction steps using synthetic fixtures, expected behavior, and
observed behavior. Remove credentials and personal data from every artifact.

## Secret handling

`ORCAROUTER_API_KEY` and future provider credentials must only come from environment variables.
The CI workflow intentionally has no provider credentials and uses no paid API calls.
