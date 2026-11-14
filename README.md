# n8n-nodes-fieldhub

An n8n community action node for FieldHub field service management. It exposes accounts, contacts, sites, work orders, materials, billing, storage, reporting, and the other FieldHub API resources in the n8n editor.

Version **0.1.3** implements **281 actions across 52 resources** from the FieldHub External API V3 **10.4.32** schema. The source includes the schema snapshot and reproducible generation scripts; running workflows do not fetch the schema. The snapshot describes one API baseline, not a guarantee that every tenant has identical fields or configuration.

## Installation

After this package is published to npm, install **n8n-nodes-fieldhub** through **Settings → Community Nodes → Install** on a self-hosted n8n instance. Follow the [n8n community-node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation).

The local archive instructions below also work before publication. n8n Cloud requires a verified community node; npm publication alone does not make the package available there. This package has not yet been verified by n8n.

This is an independently maintained community integration, not an official FieldHub or n8n product.

## Local installation and testing

Use a local or self-hosted n8n instance to test a local package build. Create credentials in that instance and start with the FieldHub sandbox.

From this repository, install the locked development dependencies and build:

```powershell
npm ci
npm run build
```

For an isolated local development instance, run:

```powershell
npm run dev
```

The n8n node CLI starts a development instance at `http://localhost:5678` and makes the FieldHub node available there. See the [n8n node CLI documentation](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/node-cli#readme) for development options.

To create a local installable archive:

```powershell
npm pack
```

This produces `n8n-nodes-fieldhub-0.1.3.tgz`. To install the archive into an existing self-hosted n8n user folder, stop n8n, run the following in PowerShell from the repository folder, then restart n8n:

```powershell
$fieldhubArchive = (Resolve-Path './n8n-nodes-fieldhub-0.1.3.tgz').Path
$n8nNodesDirectory = Join-Path $env:USERPROFILE '.n8n/nodes'
New-Item -ItemType Directory -Force -Path $n8nNodesDirectory | Out-Null
Set-Location -LiteralPath $n8nNodesDirectory
npm install "$fieldhubArchive"
```

Adapt the archive and n8n user-folder paths for your installation. For a Docker container named `n8n-n8n-1`, run the following from the repository folder (replace the container name if needed):

```powershell
docker cp './n8n-nodes-fieldhub-0.1.3.tgz' n8n-n8n-1:/tmp/fieldhub.tgz
docker exec -u node n8n-n8n-1 sh -c "mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install /tmp/fieldhub.tgz"
# After npm reports success:
docker restart n8n-n8n-1
```

Refresh the n8n editor and search for **FieldHub** in the node picker. The package uses the host n8n runtime; its optional `n8n-workflow` peer is not installed separately. If an older archive fails while compiling `isolated-vm` or asks for Python, copy the rebuilt archive again and repeat the install command. No native build tools are required to install this archive.

Local package installation is not an n8n Cloud installation method; publication and any community-node verification/submission are separate steps. This repository does not publish or modify an existing workflow.

## Credentials

Use **API Token** and create a **FieldHub API** credential in n8n. OAuth2 is temporarily disabled in this release and its credential is not registered or included in the npm package. Secrets belong in the credential dialog, not in node fields or workflow JSON. Token credentials test access with `GET /v3/profile/`.

**API URL** is required, must use HTTPS, and starts empty. Enter your own FieldHub API URL explicitly; there is no fallback URL. For example, `https://api.example.com/v3` illustrates the expected format; replace it with the API domain for your sandbox or production environment. You can supply the API domain with or without `/v3` or a trailing slash; requests use exactly one `/v3` suffix.

The API URL must not contain embedded login credentials, query strings, fragments, internal whitespace, or backslashes. Use the endpoint itself and enter the API token in its dedicated field.

HTTPS is required for existing credentials as well as new ones, on both saved node versions. Before upgrading from 0.1.1 or earlier, replace any HTTP API URL with the HTTPS endpoint supplied for your environment.

### API token

1. In FieldHub, open **Profile → API Access Keys → Create Token**.
2. In n8n, create a **FieldHub API** credential.
3. Set **API URL** and paste the token into **API Token**, without the `Token ` prefix.
4. Save and test the credential.

Requests send `Authorization: Token <token>`. The token inherits its FieldHub user's permissions. The existing credential type identifier `fieldhubApi` and stored `apiKey` property are preserved for compatibility with the scaffold; the previous placeholder header has been corrected.

### OAuth2 temporarily disabled

OAuth2 is unavailable in this release while live authorization and refresh validation are deferred. Existing nodes configured for OAuth2 must change **Authentication** to **API Token** and select a **FieldHub API** credential. Updating this package does not delete saved n8n credentials or rewrite workflows. The OAuth2 implementation and its unit tests remain in the source for a future release, but its credential files are excluded from the npm archive.

## Resources and actions

Each documentation tag that has endpoints becomes a resource. Operations retain stable OpenAPI operation IDs and the documented HTTP method. **Get** uses GET, **Get Many** lists results, **Create** uses POST, **Replace** uses PUT, **Update** uses PATCH, and **Delete** uses DELETE. Domain actions such as Cancel, Archive, Link Contact, and Change Status use the method documented for that action.

The 52 resources are:

| Resource                | Resource               | Resource                |
| ----------------------- | ---------------------- | ----------------------- |
| Account Industries      | Account Sources        | Account Statuses        |
| Account Types           | Accounting Registers   | Accounts                |
| Assumptions             | Bank Accounts          | Bank Checks             |
| Billing Rules           | Business Units         | Central Station         |
| Contacts                | Contracts              | Events and Webhooks     |
| Expenses                | Flow Processes         | Flow TimeLine           |
| Flows                   | General Ledger         | Income Statement Report |
| Inspection Maintenances | Invoices               | Labors                  |
| Material Manufacturers  | Materials              | Materials Catalogs      |
| Materials Catalogs Tree | Non Inventory Types    | Opportunities           |
| Profile                 | Recurring Services     | Recurrings              |
| Sales Taxes             | Schedule               | Scope of Works          |
| Site Systems            | Sites                  | Sites Contact           |
| Storage                 | Teams                  | Vendor Bills            |
| Vendor Credits          | Vendor Payments        | Vendors                 |
| Work Order Activities   | Work Order Job Costing | Work Order Problems     |
| Work Order Resolutions  | Work Order Time Log    | Work Order Types        |
| Work Orders             |                        |                         |

The [complete operation inventory](docs/operations.md) records all 284 schema operations. Three are deliberately unavailable in the node:

| Method and endpoint                            | Reason in the baseline documentation                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /v3/materials/alternative-prices/{id}/`   | Access forbidden to all scopes                                                                  |
| `PUT /v3/storage/files/{id}/`                  | Access forbidden to all scopes; PATCH metadata and binary upload are separate supported actions |
| `POST /v3/work-orders/create-from-inspection/` | API currently not in use                                                                        |

The Intro documentation tag is descriptive and has no operations. This is an action node; Events and Webhooks actions manage API resources and do not create a new n8n trigger type.

## Using the node

Choose a resource and operation, fill in required identifiers, and add optional fields or filters as needed. Path identifiers such as a Work Order's internal ID are distinct from its human-readable number. Enum fields show documented choices; nested objects and arrays use JSON editors.

For requests with a JSON body, select **Fields** to use the form or **JSON** to provide the body directly. The two modes are separate; form values are not merged into a JSON body. Read-only fields are not offered as writable form inputs. **Update** uses PATCH and leaves unselected fields omitted. Explicit values such as `false`, `0`, `[]`, and supported `null` values are preserved. **Replace** uses PUT; follow the operation's required fields when replacing a record.

Contact **Password** and **Confirm Password** form fields are masked in the editor. This is display privacy only: literal node-parameter values remain part of saved or exported workflows, and JSON body input is not masked. Avoid embedding reusable secrets in workflow parameters; use an appropriate protected source available to your n8n installation.

For paginated endpoints, **Return All** retrieves every page; with Return All off, **Limit** defaults to **50** total results. Filters remain in effect on every page. Each result becomes its own n8n item, with input-item linking preserved. The default request timeout is **30 seconds**. The node does not add automatic retries to writes; use n8n's error handling and retry settings deliberately for your workflow.

### Output and existing workflows

New nodes use node version **1.1**. For record schemas with more than ten fields, **Simplify** is on by default and returns up to ten documented fields, including an identifier when available. Turn it off to retain the full API record, including response fields absent from the snapshot. When used as an AI tool, the same operations offer **Output** choices: **Simplified**, **Raw**, and **Selected Fields**. Selected Fields uses the **Fields** selection and retains an identifier when available. Smaller records and responses without a record schema keep their original shape.

Saved node version **1** workflows retain their previous raw output and deletion-response behavior after installing this package. Upgrading a node to **1.1** enables the new defaults; review downstream expressions and use raw output when they rely on fields omitted by simplification. Successful Delete operations in 1.1 return `{ "deleted": true }`. Pagination, input-item links, and pending-report status metadata are preserved in either version.

### Tenant-specific API behavior

Check your environment's `/v3/redoc/` and `/v3/schema/` before relying on a field, enum, or required-field list. For example, the baseline `InvoiceAdd.entry_category` field is nullable and is absent from the schema's `required` list, but its documentation makes it mandatory when the tenant enables **Require GL Categories for Income and Expense lines**. The node cannot infer that setting from the static snapshot.

Invoice delivery aliases such as `email+cups`, `email+pdf`, `pdf`, `email+10ftp`, and `lob` are API values, not tenant identifiers. Available delivery methods and their display labels depend on tenant configuration. Confirm the values accepted by the target tenant before creating or updating invoices.

### Work Order examples

These examples demonstrate sandbox list and detail requests using the custom node. Example values are placeholders, not customer data.

Import [the Work Order lookup example](examples/work-order-lookup.json), select your own FieldHub credential, and execute it manually. It lists up to five work orders, then retrieves each one with its returned ID. It contains no credentials, tenant URLs, or write operations.

| Setting            | List / search work orders                                   | Get one work order                                                 |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Authentication     | API Token                                                   | API Token                                                          |
| Credential         | FieldHub API, sandbox API URL                               | Same credential                                                    |
| Resource           | Work Orders                                                 | Work Orders                                                        |
| Operation          | Get Many (`work_orders_list`)                               | Get (`work_orders_retrieve`)                                       |
| Return All / Limit | Off / 50                                                    | Not applicable                                                     |
| Filters            | Search: `inspection`; optional Number or Customer PO Number | Not applicable                                                     |
| ID                 | Not applicable                                              | An internal numeric ID from the list response, e.g. `{{$json.id}}` |
| HTTP request       | `GET /v3/work-orders/?limit=50&offset=0&search=inspection`  | `GET /v3/work-orders/{id}/`                                        |

For a partial edit, use **Work Orders → Update** (`work_orders_partial_update`), set the internal ID, choose JSON input, and supply only the changed fields, for example:

```json
{
	"summary": "Annual inspection follow-up",
	"customer_po_number": "PO-EXAMPLE"
}
```

The node sends PATCH to `/v3/work-orders/{id}/`; fields omitted from this body are not sent. Use a sandbox record for write testing.

### Contracts and recurring billing links

The **Contracts** resource supports listing and retrieving contract artifacts, creating them, replacing or partially updating them, and Archive, Unarchive, Resume, and Terminate actions. Contract types are available through **Get Many Types** and **Get Type**. The list supports account, site, site-system, status, and date filters with normal pagination.

For a read-only review, use **Contracts → Get Many**, filter by Account and optionally Sites / Sitesystems (JSON arrays of IDs), then **Get** each artifact by its returned ID. Turn **Simplify** off to retain all dates, renewal terms, site/system associations and notes. Use **Recurrings → Get Many Recurring Billings** to inspect associated billing lines. Reading records does not establish which signed document is the latest applicable contract; review the supporting document before making changes.

For creation, the API requires Account, Contract Type, Contract Number, Start Date, Initial Term (months), and **Initial Term Expiration Date**. Supply that date explicitly: the API does not promise the UI's automatic date calculation. Auto Renewal requires a Renewal Term. The form labels `rate_escalation_date` as **Rate Lock Until Date**, matching the API description. The returned `next_expiration_date` is computed and is not an editable contract field.

**Recurrings → Update Recurring Billing** exposes **Contract** under Additional Fields. Set it to the artifact's internal ID, not its contract number. JSON mode can send only `{"contract": 123}`, or `{"contract": null}` to clear a link where permitted. The contract must belong to the same account as the billing. Contract sites must belong to the contract account, and systems must belong to its sites. The API validates these relationships; the node does not infer or change them automatically.

### Upgrading to API 10.4.32

The [API upgrade verification](docs/api-upgrade-10.4.32.md) records the local checks and compatibility review. Version 0.1.3 adds 19 actions, retains every prior operation ID, path, method and resource value, and keeps saved node versions 1 and 1.1. It also adds General Ledger entry/category actions and recurring change-reason lookups, updated billing enums, and the current storage object types. Existing contact email form inputs and comma-separated file-tag filters remain accepted. File Tags accepts comma-separated IDs or JSON arrays of numeric IDs.

Storage metadata object links now validate the documented case-sensitive model names (for example `Contract`, `Site`, and `SiteSystem`). Billing-group updates return both `id` and generated `periods`; both are retained. Review the current response and request schemas for your API environment before reusing old JSON bodies. No credentials, workflow execution, or installation is changed by updating the package source.

### Storage uploads and downloads

Storage upload is a two-step API process. First create the file's metadata record, then pass its returned ID to **Upload File Bytes** and select the incoming binary data property. The upload sends the file bytes through n8n's binary-data helpers. Updating a metadata record with PATCH does not replace its bytes. **Get File Download URL** returns the API's `{ "url": "..." }` response; it does not automatically fetch the remote file.

### Income Statement reports

Create a report, inspect its status using the returned session UUID, and request its rows when ready. These are separate actions. Add a Wait node and explicit status branching if your workflow needs polling. Report sessions expire after 24 hours according to the baseline API documentation.

Feed mode can return HTTP 202 while computation is pending. The node preserves the processing body with `statusCode: 202` and the `retryAfter` header value instead of treating it as an empty page. It does not automatically poll. HTTP 204 responses produce `{ "success": true }` so downstream actions can continue, except completed Delete operations in version 1.1, which produce `{ "deleted": true }`.

## Development and verification

```powershell
npm run generate
npm run check
npm pack --dry-run
```

The checked-in snapshot is `api/fieldhub-openapi.json`. Regeneration uses this local snapshot and explicit API overrides. `npm run check` runs publication-content checks, lint, build, generated-file consistency, type checks, mocked tests, and standalone package installation in that order. Automated checks cover operation inventory, resource/path/method mapping, request bodies, authentication configuration, pagination, binary requests, response handling, and API errors using mocks. The package installation check packs the built node and installs it offline into an empty temporary project with an empty npm cache, verifying that no extra runtime dependencies are installed. Both the source and the installed archive are checked for unexpected URL hosts, local filesystem paths, common secret formats, and unexpected packaged files. These checks supplement human review; they do not prove that arbitrary text contains no private data.

CI runs the same command. The publish workflow checks out the pushed version tag, verifies it equals `package.json`'s version, and invokes the native n8n release command. Immediately before npm publishes, `prepublishOnly` preserves the native release-only guard and runs the complete check suite on that tagged source. A failing check stops publication; a passing CI run on another commit is not used as approval. Native n8n release behavior, GitHub OIDC authentication, and npm provenance remain in place. The interactive local `npm run release` command creates and pushes release metadata; npm publication happens in the tagged workflow.

See [Publishing and n8n submission](docs/publishing.md) for the release sequence, first-publication authentication, and checks that require the published package.

### Manual acceptance checks still required

Mocks and offline installation do not establish live FieldHub or n8n Cloud compatibility. Complete these checks with authorized test accounts and disposable records before publication, recording the n8n version, FieldHub schema version, relevant tenant settings, and results without including credentials or customer data:

- **Cross-tenant schema:** Compare the baseline with schemas from at least two independently configured test tenants. Check endpoint availability, writable fields, required lists, enum choices, and the three excluded operations. Exercise a read, a paginated list, a create, and a partial update in each tenant.
- **Invoice configuration:** Test invoice creation with GL categories required and disabled, using tenants or test configurations that cover both states. Confirm when `entry_category` may be omitted or null and when a valid category is required. Verify accepted invoice delivery aliases and labels against each tenant's configuration.
- **Live API token:** Test `/v3/profile/`, a scoped read and pagination with an authorized sandbox credential; confirm invalid or insufficient-permission tokens fail clearly. OAuth2 acceptance is deferred while OAuth2 remains disabled.
- **Output migration:** Open a saved version 1 workflow and confirm its raw fields and delete result remain unchanged. In version 1.1, compare Simplify on/off and all AI-tool Output choices on a large record, including pagination and input-item links. Confirm a completed Delete emits `deleted: true` and a pending report retains its status and retry metadata.
- **Editor and transport:** Confirm both contact password inputs are visually masked in form mode. With dummy credentials, confirm HTTP API URL values fail before an authenticated request is sent. Then verify valid HTTPS credentials work normally.

These are acceptance steps to perform, not claims of completed live testing.

## Compatibility and references

The package uses n8n's declarative API with API Token authentication and saved node versions 1 and 1.1. OAuth2 is temporarily disabled. Build dependencies are tested with `n8n-workflow` 2.39.3 and `@n8n/node-cli` 0.48.5; the exact dependency tree is recorded in `package-lock.json`. See `package.json` for the supported `n8n-workflow` peer range. It has not been certified for n8n Cloud or live-tested with customer credentials.

For your instance's API documentation and current schema, open `/v3/redoc/` and `/v3/schema/` on its API domain. The checked-in baseline is `api/fieldhub-openapi.json`.

- [FieldHub operation coverage](docs/operations.md)
- [n8n community-node installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/manual-installation)
- [Source repository](https://github.com/Henrywils0n/n8n-nodes-fieldhub)
- [Changelog](CHANGELOG.md)

## Version history

**0.1.3:** Upgrade to API 10.4.32: 52 resources, 281 actions, contract artifacts and billing links, General Ledger and recurring change reasons. Preserve existing endpoint identities and compatible email/file-tag input.

**0.1.2:** Require HTTPS endpoints, mask contact password inputs, add versioned simplified and AI-tool output, and gate publication on the full verification suite. Existing version 1 output stays compatible; HTTP credentials require migration.

**0.1.1:** Fix the OAuth scope field collision with n8n project permissions and preserve blank defaults for new credentials.

**0.1.0:** Initial FieldHub implementation with 50 resources, 262 actions, API token and OAuth2 credentials, form and JSON inputs, pagination, storage uploads, and report responses.
