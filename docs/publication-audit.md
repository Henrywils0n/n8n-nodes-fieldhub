# Publication audit — 2026-11-09

This is the historical 0.1.2 audit. See [API upgrade verification](api-upgrade-10.4.32.md) for the 0.1.3 / API 10.4.32 validation.

## Result

Version **0.1.2** passes the local publication checks. No company-specific configuration, tenant URLs, customer records, local user paths, or common secret formats were detected in the reviewed source, schema, generated catalog, built runtime and package contents. Maintainer attribution and source-repository links are intentionally retained. This is a release candidate, not an n8n verification decision.

## Changes made during this audit

- Fixed empty HTTP 202 responses losing their pending status and Retry-After value. Both saved node versions preserve pending results and item links; pagination stops without polling.
- Made ascending and descending sort choices distinguishable without changing the HTTP query values.
- Added source and installed-package content checks for unexpected URL hosts, local user paths and common secret formats; added a package file allowlist and regression tests. New real URL hosts require review. Automated pattern checks supplement manual inspection and cannot prove arbitrary text is free of private information.
- Added an importable, inactive Work Order example with no stored credentials or tenant URL. It lists and retrieves work orders without writes.
- Added public installation and release/submission documentation, a package issue link, explicit public/provenance publish settings and included changelog/example documentation in the archive.
- Enforced LF text checkout with Git attributes so snapshot hashes and generated-file checks stay reproducible on Windows and Linux.
- Pinned the audited node CLI at 0.48.5 and CI Node.js at 24. Kept package version 0.1.2 and the existing internal node/credential identifiers.

## Verification completed

| Check                              | Result                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| Publication-content checks         | Passed for source and installed archive                                              |
| n8n strict lint                    | Passed, no lint findings                                                             |
| TypeScript build and type checking | Passed                                                                               |
| Generated-file consistency         | Passed                                                                               |
| API inventory                      | 50 resources, 262 actions, 3 documented exclusions, 77 paginated operations          |
| Automated tests                    | 82 passed; none failed or skipped                                                    |
| Offline package installation       | Passed with no additional runtime packages installed                                 |
| Packaged runtime loading           | Both credentials and all 262 node actions load against the host n8n-workflow runtime |
| Icons and package entry points     | Verified                                                                             |
| GitHub repository visibility       | Public repository confirmed                                                          |
| npm availability                   | Package not yet published when checked                                               |

Validation used Node.js 24.21.0, npm 8.19.4 locally, n8n-workflow 2.39.3 and node CLI 0.48.5. CI uses Node.js 24 with its bundled npm; npm trusted publishing needs npm 11.5.1 or newer. Node CLI emitted upstream child-process/color deprecation warnings during local checks; these were not node lint findings.

## Remaining release steps

1. Complete the live acceptance checks listed in the README, especially token access, OAuth authorization/refresh, tenant-dependent fields and editor/output migration. No customer credentials or live API writes were used in this audit.
2. Commit and push the reviewed implementation before tagging. At audit time, the local implementation had not been committed to the public repository.
3. Configure npm publication permissions, then publish through the existing GitHub Actions workflow with provenance. No npm account settings, release tags or publication were changed here.
4. Run the official scanner against the exact published package version and submit through the n8n Creator Portal. The registry/provenance scanner cannot complete against this unpublished archive. n8n approval and Cloud availability remain unverified.

See [Publishing and n8n submission](publishing.md) for the exact sequence and current official documentation.

## Local archive

- File: `n8n-nodes-fieldhub-0.1.2.tgz`
- Size: 115150 bytes; 45 packaged files
- SHA-256: `52291e67633c170e663b2d0962e1ff253018a27e3ccc369e477853f7a9ca778c`
