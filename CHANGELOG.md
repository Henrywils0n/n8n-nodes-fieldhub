# Changelog

## 0.1.4

- Correct the node codex identifier to `n8n-nodes-fieldhub.fieldhub` so it matches the package and internal node name.

## 0.1.3

- Temporarily disable OAuth2: offer and register API Token authentication only, exclude the OAuth2 credential from the npm archive, and reject saved OAuth2 selections with migration instructions. Keep the OAuth2 source for later re-enablement.

- Update the checked-in OpenAPI snapshot from 10.2.16 to 10.4.32: 284 documented operations, 281 usable actions across 52 resources, and 82 paginated actions. Keep the same three documented exclusions.
- Add the Contracts resource with artifact create/read/update/replace, lifecycle actions and type lookups; expose the editable recurring-billing Contract link.
- Add General Ledger entry/category actions and recurring change-reason lookups, and refresh all documented fields, filters, enums and response schemas.
- Label the contract rate-escalation field as Rate Lock Until Date without changing its API key. Require an explicit initial expiration date per the API schema.
- Preserve plain contact email inputs (including blank and nullable values) and existing comma-separated storage file-tag filters when adopting the newer schemas.
- Retain all existing operation IDs, paths, methods, resource values, node versions and credential identifiers. Add upgrade regression coverage and keep API URLs required and blank by default.

## 0.1.2

- Preserve HTTP 202 processing metadata for empty response bodies and distinguish ascending/descending ordering choices.
- Check source and packed content for accidental private data, pin the audited node CLI, and add a credential-free example workflow.
- Document public installation, initial npm publication, provenance, and n8n submission requirements.

- Require HTTPS for API and OAuth endpoints, including existing credentials; replace any HTTP endpoint with its HTTPS equivalent before running or reconnecting.
- Mask contact password fields in the editor. Masking does not encrypt literal values stored as workflow parameters.
- Add node version 1.1 with simplified output for large records and AI-tool output choices; keep saved node version 1 workflows on their existing response shape.
- Use sentence case for action descriptions and normalize successful deletion results for node version 1.1.
- Preserve the original logo in self-contained SVG variants for both editor themes; remove icon lint exceptions.
- Use native n8n JSON parsing and attach input-item context to malformed API-response errors.
- Gate npm publication on lint, build, generated-file checks, type checks, tests, and standalone package installation using the tagged source; preserve native n8n release guards and provenance.
- Document tenant-dependent invoice fields and the outstanding cross-tenant and live OAuth acceptance checks.

## 0.1.1

- Fix OAuth scope autofill by separating the FieldHub scope input from n8n project-permission metadata. New credentials start with blank scopes.
- Do not import the previous scope input automatically; re-enter intended FieldHub scopes before reconnecting existing OAuth credentials.
- Clarify that blank scopes require support for default scopes in the FieldHub application.

## 0.1.0

- Require explicit OAuth endpoint URLs and use tenant-neutral documentation, examples, and schema provenance.

- Require an explicitly entered API URL for both credential types; remove the sandbox default and request fallbacks.

- Replace scaffold resources with 262 FieldHub actions across all 50 API resource groups from schema version 10.2.16.
- Inventory all 265 operations and explicitly exclude the three unavailable API endpoints.
- Add form and JSON body modes, documented filters, paginated results, binary uploads, and asynchronous report response handling.
- Correct token authentication and add OAuth2 authorization-code credentials with refresh support and configurable environments.
- Add reproducible schema generation, mocked tests, local packaging instructions, and CI verification.
- Use n8n's host runtime for local archive installation, avoiding an unnecessary native dependency build; verify offline installation in CI.
