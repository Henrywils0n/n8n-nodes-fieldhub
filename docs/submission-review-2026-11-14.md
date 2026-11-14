# Submission review - 2026-11-14

**Superseded archive:** This review describes the build before OAuth2 was temporarily disabled. The current 0.1.3 release is API-token-only; OAuth2 is no longer a submission acceptance gate while disabled. The old archive hash and credential count below are historical. See the README for the current authentication scope.

## API-token-only update - 2026-11-14

At the maintainer's request, OAuth2 is temporarily disabled. Only the FieldHub API token credential is registered and offered in the node. Saved non-token selections fail with migration instructions before request construction; saved credentials and workflows are not deleted or rewritten. OAuth2 source and dormant unit tests remain for future restoration, while all compiled OAuth2 credential files are excluded from the archive.

The complete check suite passed after this change: strict lint, build, generated-file consistency, type checking, **102 tests**, and offline package installation. The rebuilt archive contains **43 files** and **124358 bytes**, with only the token credential registered. Its SHA-256 is `8f9a112ead68a10137121909a6758b43f6e1b1a10ee31a5a327d364354e68518`.

This supersedes the earlier archive hash and credential count below. OAuth2 authorization/refresh is deferred and is not an acceptance gate for this token-only release. Live token/tenant acceptance, pushing the reviewed source, npm publication with provenance and the official scanner/Creator Portal review remain outstanding. This update was not published or installed into the running n8n instance.

Package: **n8n-nodes-fieldhub 0.1.3**. API baseline: **10.4.32**.

## Verdict

The local source and package pass the reviewed technical publication checks. No release-blocking code defect or company-specific content was found. The package is a release candidate, not yet ready for final n8n submission: the reviewed implementation is not on the public main branch, the package is unpublished, and live acceptance and registry verification remain outstanding.

This review made no runtime code changes and kept version 0.1.3. It rebuilt the package and added this audit record. No workflow was executed, authenticated FieldHub request made, credential accessed, release tag created, repository push performed, or package published.

## Completed checks

| Check                                 | Result                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Strict n8n CLI lint                   | Passed, no node lint findings                                                                                 |
| TypeScript build and type checking    | Passed                                                                                                        |
| Reproducible schema generation        | Passed                                                                                                        |
| Coverage inventory                    | 284 operations: 281 actions and 3 documented exclusions; 52 resources; 82 paginated actions                   |
| Automated tests                       | 100 passed, none failed or skipped                                                                            |
| Standalone offline installation       | Passed with an empty consumer/cache and no additional runtime dependencies                                    |
| Packaged runtime loading              | Node and both credentials load against the host n8n runtime                                                   |
| Package contents and entry points     | 46 allowlisted files; icons, MIT license, public documentation and example verified                           |
| Metadata and dependency configuration | Package/lockfile match; strict mode, keyword, entry points and optional host peer verified                    |
| CI and publication workflow           | Complete checks run against the release tag; tag/version assertion, GitHub OIDC and npm provenance configured |

`npm run check` completed successfully. `npm pack --json --offline` produced the archive below. The CLI emitted existing upstream child-process/color warnings; these were not node lint errors. Local tools were Node.js 24.21.0, npm 8.19.4, node CLI 0.48.5 and n8n-workflow 2.39.3. Publication CI uses Node.js 24 with its bundled npm.

## Runtime and privacy review

Reviewed request construction, form/JSON separation, required and read-only fields, omitted PATCH fields, explicit null/false/zero values, nested identifiers, query serialization, token/OAuth configuration, pagination, binary helpers, HTTP 202/204 behavior, errors, item links and compatibility of saved node versions 1 and 1.1. No substantive defect was identified in these paths.

Reviewed source, schema, generated catalog, built runtime, public examples, documentation, logo metadata and packaged files. No tenant URLs, customer records, saved credential references, local user paths, private workflow exports or PDF fixtures were found. API/OAuth URLs are empty and required. Public maintainer attribution and repository links are intentionally retained. The content scans supplement manual review; they do not prove arbitrary text contains no private information. Git history and third-party development dependency contents were outside the privacy review.

## Remaining submission requirements

1. **Complete and record live acceptance.** The README lists OAuth authorization/refresh, tenant-dependent fields, transport/editor checks and saved-version output compatibility. This audit used mocked transport and did not establish those live results. Existing read-only workflow testing does not cover all release acceptance cases.
2. **Commit and push the reviewed source.** On this review date, the [public repository](https://github.com/Henrywils0n/n8n-nodes-fieldhub) was public but main still contained scaffold version 0.1.0, an empty package description and placeholder README content. The local 0.1.3 implementation and lockfile remain uncommitted/unpushed. Do not release the scaffold or omit the untracked generated/source files.
3. **Publish through GitHub Actions with provenance.** The npm registry returned 404 for this package at review time. Configure first-publication credentials or an applicable trusted publisher as described in [Publishing](publishing.md), then publish the reviewed version through the existing workflow. Account permissions and publication authentication were not inspected or changed.
4. **Run the official scanner and submit.** After publication, run the n8n community-package scanner against the exact published version, address findings, and submit through the [Creator Portal](https://creators.n8n.io/nodes). Registry provenance checks cannot be completed against the unpublished local archive. n8n approval and Cloud availability remain pending.

These release steps follow the current [n8n submission requirements](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes.md) and [verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md). In particular, verification candidates must be published through GitHub Actions with provenance; a local npm publish is insufficient.

## Audited local archive

- File: `n8n-nodes-fieldhub-0.1.3.tgz`
- Compressed size: 125130 bytes
- Unpacked size: 1365400 bytes
- Files: 46
- SHA-256: `cc3772b18c2dd578710193dc04e312ab35407e854a13d86ec77c79fe14c4541e`

The rebuilt archive is byte-for-byte identical to the previously built 0.1.3 archive. This audit document is source documentation and is not part of that package archive.
