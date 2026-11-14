# Publishing and n8n submission

This package is prepared for publication, but local checks do not constitute npm publication or n8n verification. The 2026-11-09 audit recorded version 0.1.2 as unpublished. The 0.1.3 API upgrade is a local build; this update does not publish it. The repository is public. Live acceptance results are not recorded yet; complete the acceptance checks in the README before releasing.

## Validate the release candidate

1. Install the locked development dependencies with `npm ci` and run `npm run check`.
2. Import `examples/work-order-lookup.json` into a local or self-hosted n8n instance, choose your own test credential in both FieldHub nodes, and execute the workflow. It only performs reads.
3. Complete the README's live API-token, cross-tenant and output-migration checks (OAuth2 and its refresh acceptance are deferred while disabled) with authorized test records. Record results without customer data or credentials.
4. Review `npm pack --dry-run`. The archive includes compiled runtime, icons, README, MIT license, changelog, operation inventory, publishing instructions and the example. Source snapshots, tests, dependencies, local configuration and build caches stay out of the archive.
5. Commit and push the complete reviewed implementation, lockfile, generated catalog and documentation to the public source repository before creating a release tag. A local archive does not update the public repository.

The content checker permits reviewed documentation/example URL hosts and rejects unknown hosts, user-directory paths and common secret patterns in source and packed content. It does not certify that arbitrary free text is free of private information; review new examples and schema snapshots before committing them.

## Set up npm publication

Use the existing GitHub Actions workflow `.github/workflows/publish.yml`. n8n requires GitHub Actions publication with provenance for verification. The workflow uses Node.js 24, whose bundled npm supports trusted publishing. Do not publish the verification candidate directly from a local machine. [n8n submission requirements](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes.md)

For this package's first publication, npm trusted-publisher configuration requires the package to exist first. Set a short-lived granular publishing token as the repository's `NPM_TOKEN` Actions secret. It must permit creation of this new package and noninteractive publication, including the required 2FA bypass. The workflow publishes with provenance even when the initial authentication uses a token. Do not place the token in source files or a committed npm configuration. [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [npm token setup](https://docs.npmjs.com/creating-and-viewing-access-tokens/)

After that first release, configure an npm trusted publisher with:

| Setting           | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| Provider          | GitHub Actions                                                 |
| Repository owner  | Henrywils0n                                                    |
| Repository        | n8n-nodes-fieldhub                                             |
| Workflow filename | publish.yml                                                    |
| Environment       | Blank, unless the workflow is deliberately configured with one |
| Allowed action    | npm publish                                                    |

New npm trust configurations allow staged publishing by default; this workflow uses direct publishing, so explicitly allow `npm publish`. Complete the first successful trusted publish within two days of creating the trust configuration. Once it works, remove and revoke the bootstrap token. npm currently requires at least npm 11.5.1 and Node 22.14 for trusted publishing. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

## Release and submit

When the tested changes are committed on main, the maintainer can run `npm run release` to choose a version, create release metadata and push the release tag. The CLI may increment the package version; use the actual released version in all subsequent commands. This is a publication action, not a validation command. The workflow requires an unprefixed version tag that exactly equals package.json's version.

Immediately before publishing, the native release guard and `npm run check` run against the tagged source. Configure authentication before triggering this workflow. A successful local check does not establish that npm account permissions, repository secrets or trusted-publisher settings are correct.

After publication, run the official scanner against the exact published version, for example:

```powershell
npx @n8n/scan-community-package@0.42.0 n8n-nodes-fieldhub@0.1.3
```

The official scanner checks registry provenance and the corresponding public source; it cannot complete that check against an unpublished local archive. Recheck the [official scanner documentation](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/scan-community-package) when releasing. Resolve any findings, then submit through the [n8n Creator Portal](https://creators.n8n.io/nodes). npm publication and a passing scanner do not guarantee n8n approval or Cloud availability.
