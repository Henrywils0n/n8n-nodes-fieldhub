# API upgrade verification — 2026-11-13

This historical upgrade validation predates the API-token-only release decision. OAuth2 is now temporarily disabled and its credential is excluded from the package; see the current README.

Package version: **0.1.3**. FieldHub OpenAPI baseline: **10.4.32** (previously 10.2.16).

## Scope

- Refreshed the checked-in schema and reproducibly generated catalog, including all request and response definitions.
- Inventory: **284 operations, 281 usable actions, 52 resources, 82 paginated actions**. The three documented exclusions remain unchanged.
- Added 11 Contracts actions, six General Ledger actions, and two recurring change-reason lookups. Exposed the recurring-billing contract association and current billing/storage fields.
- Confirmed all 265 prior operation IDs, methods, paths and resource tags remain unchanged; an identity fixture enforces this in tests.
- Preserved plain contact email form values with the new email-or-empty-string schema, and accepted existing comma-separated Storage file-tag filters alongside arrays.
- Kept credential URLs empty and required, credential/node identifiers stable, and saved node versions 1 and 1.1.

## Validation

The complete npm run check suite passed: source publication-content checks, strict n8n lint, TypeScript build, generated-file consistency, type checking, **100 automated tests**, and isolated offline installation/package loading. Both credentials and all 281 actions load from the archive. Packaged content checks reject unreviewed hosts, local user paths, common secret formats and unexpected files. Manual inspection found no tenant URL or company-specific configuration added by the schema update.

The public schema was retrieved without credentials. Tests use local fixtures and mocked responses. No workflow was executed or modified, no live authenticated FieldHub request was made, and no running n8n installation was changed. npm publication and n8n submission were not performed. Live credential and tenant acceptance checks remain pending as documented in the README.

The node CLI emits its existing upstream child-process deprecation warning; lint reported no node findings.

Snapshot SHA-256: `2ca5803591b8bc0f0c4d8dee00e4952693ffc34d3dbe410d55ccaa4a70d4a556`.

For the historical pre-upgrade audit, see [Publication audit](publication-audit.md). For upgrade usage and current capabilities, see the [README](../README.md) and [operation inventory](operations.md).
