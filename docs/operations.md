# FieldHub operation coverage

Generated from the checked-in FieldHub OpenAPI 10.4.32 snapshot (`api/fieldhub-openapi.json`). Run `npm run generate` after deliberately updating the checked-in snapshot.

All 284 documented operations are inventoried: **281 actions across 52 resources**, with three documented exclusions. Names below are the operation labels shown in n8n; operation IDs remain the stable values stored in workflows. All paths retain the API version prefix.

## Unavailable endpoints

| Resource | Operation ID | Method | Path | Reason |
| --- | --- | --- | --- | --- |
| Materials | `materials_alternative_prices_retrieve` | GET | `/v3/materials/alternative-prices/{id}/` | The API documentation marks this endpoint as access forbidden to any. |
| Storage | `storage_files_update` | PUT | `/v3/storage/files/{id}/` | The API documentation marks this endpoint as access forbidden to any. |
| Work Orders | `work_orders_create_from_inspection_create` | POST | `/v3/work-orders/create-from-inspection/` | The API documentation states that this endpoint is currently not in use. |

## Account Industries

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/accounts/industries/` | `accounts_industries_list` | Yes |
| Get | GET | `/v3/accounts/industries/{id}/` | `accounts_industries_retrieve` |  |

## Account Sources

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/accounts/sources/` | `accounts_sources_list` | Yes |
| Get | GET | `/v3/accounts/sources/{id}/` | `accounts_sources_retrieve` |  |

## Account Statuses

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/accounts/statuses/` | `accounts_statuses_list` | Yes |
| Get | GET | `/v3/accounts/statuses/{id}/` | `accounts_statuses_retrieve` |  |

## Account Types

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/accounts/types/` | `accounts_types_list` | Yes |
| Get | GET | `/v3/accounts/types/{id}/` | `accounts_types_retrieve` |  |

## Accounting Registers

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Register Classes | GET | `/v3/register/classes/` | `register_classes_list` | Yes |
| Get Register Class | GET | `/v3/register/classes/{id}/` | `register_classes_retrieve` |  |
| Get Many Register Profiles | GET | `/v3/register/profiles/` | `register_profiles_list` | Yes |
| Get Register Profile | GET | `/v3/register/profiles/{id}/` | `register_profiles_retrieve` |  |
| Get Register Profile By Slug | GET | `/v3/register/profiles/by-slug/{slug}/` | `register_profiles_by_slug_retrieve` |  |
| Get Many Register Types | GET | `/v3/register/types/` | `register_types_list` | Yes |
| Get Register Type | GET | `/v3/register/types/{id}/` | `register_types_retrieve` |  |
| Get Many Registers | GET | `/v3/registers/` | `registers_list` | Yes |
| Get Register | GET | `/v3/registers/{id}/` | `registers_retrieve` |  |

## Accounts

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/accounts/` | `accounts_list` | Yes |
| Create | POST | `/v3/accounts/` | `accounts_create` |  |
| Get Many Account Addresses | GET | `/v3/accounts/{account_id}/addresses/` | `accounts_addresses_list` | Yes |
| Get Many Related Contacts | GET | `/v3/accounts/{account_id}/contacts/` | `accounts_contacts_list` | Yes |
| Get Related Contact | GET | `/v3/accounts/{account_id}/contacts/{id}/` | `accounts_contacts_retrieve` |  |
| Link Contact | POST | `/v3/accounts/{account_id}/contacts/link/` | `accounts_contacts_link_create` |  |
| Get Many Related Sites | GET | `/v3/accounts/{account_id}/sites/` | `accounts_sites_list` | Yes |
| Get Related Site | GET | `/v3/accounts/{account_id}/sites/{id}/` | `accounts_sites_retrieve` |  |
| Link Site | POST | `/v3/accounts/{account_id}/sites/link/` | `accounts_sites_link_create` |  |
| Unlink Site | POST | `/v3/accounts/{account_id}/sites/unlink/` | `accounts_sites_unlink_create` |  |
| Get | GET | `/v3/accounts/{id}/` | `accounts_retrieve` |  |
| Replace | PUT | `/v3/accounts/{id}/` | `accounts_update` |  |
| Update | PATCH | `/v3/accounts/{id}/` | `accounts_partial_update` |  |
| Get Many Delivery Methods | GET | `/v3/accounts/delivery-methods/` | `accounts_delivery_methods_list` | Yes |
| Quick Create | POST | `/v3/accounts/quick/` | `accounts_quick_create` |  |

## Assumptions

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/assumptions/` | `assumptions_list` | Yes |
| Create | POST | `/v3/assumptions/` | `assumptions_create` |  |
| Get | GET | `/v3/assumptions/{id}/` | `assumptions_retrieve` |  |
| Replace | PUT | `/v3/assumptions/{id}/` | `assumptions_update` |  |
| Update | PATCH | `/v3/assumptions/{id}/` | `assumptions_partial_update` |  |

## Bank Accounts

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/bank/accounts/` | `bank_accounts_list` | Yes |
| Get | GET | `/v3/bank/accounts/{id}/` | `bank_accounts_retrieve` |  |

## Bank Checks

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/bank/checks/` | `bank_checks_list` | Yes |
| Get | GET | `/v3/bank/checks/{id}/` | `bank_checks_retrieve` |  |

## Billing Rules

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Billing Rules | GET | `/v3/billing-rules/` | `billing_rules_list` | Yes |
| Create Billing Rule | POST | `/v3/billing-rules/` | `billing_rules_create` |  |
| Get Billing Rule | GET | `/v3/billing-rules/{id}/` | `billing_rules_retrieve` |  |
| Replace Billing Rule | PUT | `/v3/billing-rules/{id}/` | `billing_rules_update` |  |
| Archive Billing Rule | POST | `/v3/billing-rules/{id}/archive/` | `billing_rules_archive_create` |  |
| Unarchive Billing Rule | POST | `/v3/billing-rules/{id}/unarchive/` | `billing_rules_unarchive_create` |  |
| Create Billing Rule Item | POST | `/v3/billing-rules/{rule_id}/items/` | `billing_rules_items_create` |  |
| Get Billing Rule Item | GET | `/v3/billing-rules/{rule_id}/items/{item_id}/` | `billing_rules_items_retrieve` |  |
| Replace Billing Rule Item | PUT | `/v3/billing-rules/{rule_id}/items/{item_id}/` | `billing_rules_items_update` |  |

## Business Units

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/business-units/` | `business_units_list` | Yes |
| Get | GET | `/v3/business-units/{id}/` | `business_units_retrieve` |  |

## Central Station

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Central Stations | GET | `/v3/centralstations/` | `centralstations_list` | Yes |
| Get Central Station | GET | `/v3/centralstations/{id}/` | `centralstations_retrieve` |  |
| Get Many Panel Types | GET | `/v3/centralstations/paneltypes/` | `centralstations_paneltypes_list` | Yes |
| Get Panel Type | GET | `/v3/centralstations/paneltypes/{id}/` | `centralstations_paneltypes_retrieve` |  |

## Contacts

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/contacts/` | `contacts_list` | Yes |
| Create | POST | `/v3/contacts/` | `contacts_create` |  |
| Get | GET | `/v3/contacts/{id}/` | `contacts_retrieve` |  |
| Replace | PUT | `/v3/contacts/{id}/` | `contacts_update` |  |
| Update | PATCH | `/v3/contacts/{id}/` | `contacts_partial_update` |  |
| Archive | POST | `/v3/contacts/{id}/archive/` | `contacts_archive_create` |  |
| Unarchive | POST | `/v3/contacts/{id}/unarchive/` | `contacts_unarchive_create` |  |
| Get Many Roles | GET | `/v3/contacts/roles/` | `contacts_roles_list` | Yes |

## Contracts

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/contracts/` | `contracts_list` | Yes |
| Create | POST | `/v3/contracts/` | `contracts_create` |  |
| Get | GET | `/v3/contracts/{id}/` | `contracts_retrieve` |  |
| Replace | PUT | `/v3/contracts/{id}/` | `contracts_update` |  |
| Update | PATCH | `/v3/contracts/{id}/` | `contracts_partial_update` |  |
| Archive | POST | `/v3/contracts/{id}/archive/` | `contracts_archive_create` |  |
| Resume | POST | `/v3/contracts/{id}/resume/` | `contracts_resume_create` |  |
| Terminate | POST | `/v3/contracts/{id}/terminate/` | `contracts_terminate_create` |  |
| Unarchive | POST | `/v3/contracts/{id}/unarchive/` | `contracts_unarchive_create` |  |
| Get Many Types | GET | `/v3/contracts/types/` | `contracts_types_list` | Yes |
| Get Type | GET | `/v3/contracts/types/{id}/` | `contracts_types_retrieve` |  |

## Events and Webhooks

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Event Groups | GET | `/v3/events/groups/` | `events_groups_list` | Yes |
| Get Event Group | GET | `/v3/events/groups/{id}/` | `events_groups_retrieve` |  |
| Get Many Webhooks | GET | `/v3/events/handlers/` | `events_handlers_list` | Yes |
| Get Webhook | GET | `/v3/events/handlers/{id}/` | `events_handlers_retrieve` |  |
| Replace Webhook | PUT | `/v3/events/handlers/{id}/` | `events_handlers_update` |  |
| Update Webhook | PATCH | `/v3/events/handlers/{id}/` | `events_handlers_partial_update` |  |
| Archive Webhook | PUT | `/v3/events/handlers/{id}/archive/` | `events_handlers_archive_update` |  |
| Disable Webhook | POST | `/v3/events/handlers/{id}/disable/` | `events_handlers_disable_create` |  |
| Enable Webhook | POST | `/v3/events/handlers/{id}/enable/` | `events_handlers_enable_create` |  |
| Unarchive Webhook | PUT | `/v3/events/handlers/{id}/unarchive/` | `events_handlers_unarchive_update` |  |
| Create Webhook | POST | `/v3/events/handlers/add/{handler_slug}/` | `events_handlers_add_create` |  |
| Get Many Event Types | GET | `/v3/events/types/` | `events_types_list` | Yes |
| Get Event Type | GET | `/v3/events/types/{id}/` | `events_types_retrieve` |  |

## Expenses

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/expenses/` | `expenses_list` | Yes |
| Create | POST | `/v3/expenses/` | `expenses_create` |  |
| Get | GET | `/v3/expenses/{id}/` | `expenses_retrieve` |  |
| Replace | PUT | `/v3/expenses/{id}/` | `expenses_update` |  |
| Update | PATCH | `/v3/expenses/{id}/` | `expenses_partial_update` |  |
| Reverse | POST | `/v3/expenses/{id}/reverse/` | `expenses_reverse_create` |  |
| Void | POST | `/v3/expenses/{id}/void/` | `expenses_void_create` |  |

## Flow Processes

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/flows/processes/` | `flows_processes_list` | Yes |
| Get | GET | `/v3/flows/processes/{id}/` | `flows_processes_retrieve` |  |

## Flow TimeLine

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Timeline Records | GET | `/v3/flows/{flow_id}/timeline/` | `flows_timeline_list` | Yes |
| Create Timeline | POST | `/v3/flows/{flow_id}/timeline/` | `flows_timeline_create` |  |
| Get Timeline | GET | `/v3/flows/{flow_id}/timeline/{id}/` | `flows_timeline_retrieve` |  |
| Add Comment | POST | `/v3/flows/{flow_id}/timeline/comment/` | `flows_timeline_comment_create` |  |
| Get Timeline Record Types | GET | `/v3/flows/{flow_id}/timeline/record-types/` | `flows_timeline_record_types_retrieve` |  |

## Flows

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/flows/` | `flows_list` | Yes |
| Get | GET | `/v3/flows/{id}/` | `flows_retrieve` |  |
| Replace | PUT | `/v3/flows/{id}/` | `flows_update` |  |
| Update | PATCH | `/v3/flows/{id}/` | `flows_partial_update` |  |
| Archive | POST | `/v3/flows/{id}/archive/` | `flows_archive_create` |  |
| Assign | PATCH | `/v3/flows/{id}/assign/` | `flows_assign_partial_update` |  |
| Cancel | PATCH | `/v3/flows/{id}/cancel/` | `flows_cancel_partial_update` |  |
| Follow | PATCH | `/v3/flows/{id}/follow/` | `flows_follow_partial_update` |  |
| Set Next Action Date | PATCH | `/v3/flows/{id}/next-action-date/` | `flows_next_action_date_partial_update` |  |
| Get Many Next Allowed Phases | GET | `/v3/flows/{id}/next-allowed-phases/` | `flows_next_allowed_phases_list` | Yes |
| Start Next Phase | PATCH | `/v3/flows/{id}/start-next-phase/` | `flows_start_next_phase_partial_update` |  |
| Unassign | PATCH | `/v3/flows/{id}/unassign/` | `flows_unassign_partial_update` |  |
| Unfollow | PATCH | `/v3/flows/{id}/unfollow/` | `flows_unfollow_partial_update` |  |
| Start | POST | `/v3/flows/start/{model}/{id}/` | `flows_start_create` |  |

## General Ledger

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/entries/` | `entries_list` | Yes |
| Create | POST | `/v3/entries/` | `entries_create` |  |
| Get | GET | `/v3/entries/{entryset_id}/` | `entries_retrieve` |  |
| Get Many GL Categories | GET | `/v3/entries/categories/` | `entries_categories_list` | Yes |
| Get GL Category | GET | `/v3/entries/categories/{id}/` | `entries_categories_retrieve` |  |
| Create Simple Entry | POST | `/v3/entries/simple/` | `entries_simple_create` |  |

## Income Statement Report

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Create Report | POST | `/v3/income-statement/` | `income_statement_report_create` |  |
| Get Report Rows | GET | `/v3/income-statement/{session_uuid}/rows/` | `income_statement_report_rows` | Yes |
| Get Report Status | GET | `/v3/income-statement/{session_uuid}/status/` | `income_statement_report_status` |  |
| Get Report Feed | GET | `/v3/income-statement/feed/` | `income_statement_report_feed` | Yes |

## Inspection Maintenances

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Inspections | GET | `/v3/inspections/` | `inspections_list` | Yes |
| Get Inspection | GET | `/v3/inspections/{id}/` | `inspections_retrieve` |  |
| Get Many Frequencies | GET | `/v3/inspections/frequencies/` | `inspections_frequencies_list` | Yes |
| Get Frequency | GET | `/v3/inspections/frequencies/{id}/` | `inspections_frequencies_retrieve` |  |
| Get Many Types | GET | `/v3/inspections/types/` | `inspections_types_list` | Yes |
| Get Type | GET | `/v3/inspections/types/{id}/` | `inspections_types_retrieve` |  |

## Invoices

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/invoices/` | `invoices_list` | Yes |
| Create | POST | `/v3/invoices/` | `invoices_create` |  |
| Get | GET | `/v3/invoices/{id}/` | `invoices_retrieve` |  |
| Replace | PUT | `/v3/invoices/{id}/` | `invoices_update` |  |
| Update | PATCH | `/v3/invoices/{id}/` | `invoices_partial_update` |  |
| Reverse | POST | `/v3/invoices/{id}/reverse/` | `invoices_reverse_create` |  |
| Void | POST | `/v3/invoices/{id}/void/` | `invoices_void_create` |  |

## Labors

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/labors/` | `labors_list` | Yes |
| Get | GET | `/v3/labors/{id}/` | `labors_retrieve` |  |

## Material Manufacturers

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/materials/manufacturers/` | `materials_manufacturers_list` | Yes |
| Create | POST | `/v3/materials/manufacturers/` | `materials_manufacturers_create` |  |
| Get | GET | `/v3/materials/manufacturers/{id}/` | `materials_manufacturers_retrieve` |  |
| Replace | PUT | `/v3/materials/manufacturers/{id}/` | `materials_manufacturers_update` |  |
| Update | PATCH | `/v3/materials/manufacturers/{id}/` | `materials_manufacturers_partial_update` |  |
| Delete | DELETE | `/v3/materials/manufacturers/{id}/` | `materials_manufacturers_destroy` |  |

## Materials

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/materials/` | `materials_list` | Yes |
| Create | POST | `/v3/materials/` | `materials_create` |  |
| Get | GET | `/v3/materials/{id}/` | `materials_retrieve` |  |
| Replace | PUT | `/v3/materials/{id}/` | `materials_update` |  |
| Update | PATCH | `/v3/materials/{id}/` | `materials_partial_update` |  |
| Delete | DELETE | `/v3/materials/{id}/` | `materials_destroy` |  |
| Get Many Alternative Price Variants | GET | `/v3/materials/alternative-prices/` | `materials_alternative_prices_list` | Yes |
| Get Many Extended Materials | GET | `/v3/materials/extended/` | `materials_extended_list` | Yes |

## Materials Catalogs

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/materials/catalogs/` | `materials_catalogs_list` | Yes |
| Create | POST | `/v3/materials/catalogs/` | `materials_catalogs_create` |  |
| Get | GET | `/v3/materials/catalogs/{id}/` | `materials_catalogs_retrieve` |  |
| Replace | PUT | `/v3/materials/catalogs/{id}/` | `materials_catalogs_update` |  |
| Update | PATCH | `/v3/materials/catalogs/{id}/` | `materials_catalogs_partial_update` |  |
| Delete | DELETE | `/v3/materials/catalogs/{id}/` | `materials_catalogs_destroy` |  |

## Materials Catalogs Tree

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/materials/catalogs/tree/` | `material-catalog-tree-list` | Yes |

## Non Inventory Types

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/non-inventory-types/` | `non_inventory_types_list` | Yes |
| Get | GET | `/v3/non-inventory-types/{id}/` | `non_inventory_types_retrieve` |  |

## Opportunities

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/opportunities/` | `opportunities_list` | Yes |
| Create | POST | `/v3/opportunities/` | `opportunities_create` |  |
| Get | GET | `/v3/opportunities/{id}/` | `opportunities_retrieve` |  |
| Quick Create | POST | `/v3/opportunities/quick/` | `opportunities_quick_create` |  |

## Profile

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get User Profile | GET | `/v3/profile/` | `profile_retrieve` |  |

## Recurring Services

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/recurrings/services/` | `recurrings_services_list` | Yes |
| Get | GET | `/v3/recurrings/services/{id}/` | `recurrings_services_retrieve` |  |

## Recurrings

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Recurring Billing Groups | GET | `/v3/recurrings/billing-groups/` | `recurrings_billing_groups_list` | Yes |
| Create Recurring Billing Group | POST | `/v3/recurrings/billing-groups/` | `recurrings_billing_groups_create` |  |
| Get Many Billings In Group | GET | `/v3/recurrings/billing-groups/{group_id}/billings/` | `recurrings_billing_groups_billings_list` | Yes |
| Get Billing In Group | GET | `/v3/recurrings/billing-groups/{group_id}/billings/{id}/` | `recurrings_billing_groups_billings_retrieve` |  |
| Get Recurring Billing Group | GET | `/v3/recurrings/billing-groups/{id}/` | `recurrings_billing_groups_retrieve` |  |
| Replace Recurring Billing Group | PUT | `/v3/recurrings/billing-groups/{id}/` | `recurrings_billing_groups_update` |  |
| Update Recurring Billing Group | PATCH | `/v3/recurrings/billing-groups/{id}/` | `recurrings_billing_groups_partial_update` |  |
| Get Many Recurring Billings | GET | `/v3/recurrings/billings/` | `recurrings_billings_list` | Yes |
| Create Recurring Billing | POST | `/v3/recurrings/billings/` | `recurrings_billings_create` |  |
| Get Many Changes For Recurring Billing | GET | `/v3/recurrings/billings/{billing_id}/changes/` | `recurrings_billings_changes_list` | Yes |
| Create Price/Quantity Change | POST | `/v3/recurrings/billings/{billing_id}/changes/` | `recurrings_billings_changes_create` |  |
| Get Change | GET | `/v3/recurrings/billings/{billing_id}/changes/{id}/` | `recurrings_billings_changes_retrieve` |  |
| Get Many Periods For Recurring Billing | GET | `/v3/recurrings/billings/{billing_id}/periods/` | `recurrings_billings_periods_list` | Yes |
| Get Period | GET | `/v3/recurrings/billings/{billing_id}/periods/{id}/` | `recurrings_billings_periods_retrieve` |  |
| Get Recurring Billing | GET | `/v3/recurrings/billings/{id}/` | `recurrings_billings_retrieve` |  |
| Replace Recurring Billing | PUT | `/v3/recurrings/billings/{id}/` | `recurrings_billings_update` |  |
| Update Recurring Billing | PATCH | `/v3/recurrings/billings/{id}/` | `recurrings_billings_partial_update` |  |
| Terminate Recurring Billing | POST | `/v3/recurrings/billings/{id}/terminate/` | `recurrings_billings_terminate_create` |  |
| Get Many Recurring Change Reasons | GET | `/v3/recurrings/change-reasons/` | `recurrings_change_reasons_list` | Yes |
| Get Recurring Change Reason | GET | `/v3/recurrings/change-reasons/{id}/` | `recurrings_change_reasons_retrieve` |  |
| Get Many Recurring Billing Profiles | GET | `/v3/recurrings/profiles/` | `recurrings_profiles_list` | Yes |
| Get Recurring Billing Profile | GET | `/v3/recurrings/profiles/{id}/` | `recurrings_profiles_retrieve` |  |

## Sales Taxes

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Tax Groups | GET | `/v3/taxes/groups/` | `taxes_groups_list` | Yes |
| Get Tax Group | GET | `/v3/taxes/groups/{id}/` | `taxes_groups_retrieve` |  |
| Get Many Tax Statuses | GET | `/v3/taxes/statuses/` | `taxes_statuses_list` | Yes |
| Get Tax Status | GET | `/v3/taxes/statuses/{id}/` | `taxes_statuses_retrieve` |  |
| Get Many Tax Zones | GET | `/v3/taxes/zones/` | `taxes_zones_list` | Yes |
| Get Tax Zone | GET | `/v3/taxes/zones/{id}/` | `taxes_zones_retrieve` |  |

## Schedule

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Schedule Slots | GET | `/v3/schedule/slots/` | `schedule_slots_list` | Yes |
| Get Schedule Slot | GET | `/v3/schedule/slots/{id}/` | `schedule_slots_retrieve` |  |

## Scope of Works

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/sow/` | `sow_list` | Yes |
| Create | POST | `/v3/sow/` | `sow_create` |  |
| Get | GET | `/v3/sow/{id}/` | `sow_retrieve` |  |

## Site Systems

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Site Systems | GET | `/v3/sitesystems/` | `sitesystems_list` | Yes |
| Create Site System | POST | `/v3/sitesystems/` | `sitesystems_create` |  |
| Get Site System | GET | `/v3/sitesystems/{id}/` | `sitesystems_retrieve` |  |
| Replace Site System | PUT | `/v3/sitesystems/{id}/` | `sitesystems_update` |  |
| Update Site System | PATCH | `/v3/sitesystems/{id}/` | `sitesystems_partial_update` |  |
| Archive Site System | DELETE | `/v3/sitesystems/{id}/` | `sitesystems_destroy` |  |
| Get Many Site System Devices | GET | `/v3/sitesystems/{sitesystem_id}/devices/` | `sitesystems_devices_list` | Yes |
| Get Many Site System Types | GET | `/v3/sitesystems/types/` | `sitesystems_types_list` | Yes |
| Get Site System Type | GET | `/v3/sitesystems/types/{id}/` | `sitesystems_types_retrieve` |  |

## Sites

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/sites/` | `sites_list` | Yes |
| Create | POST | `/v3/sites/` | `sites_create` |  |
| Get | GET | `/v3/sites/{id}/` | `sites_retrieve` |  |
| Replace | PUT | `/v3/sites/{id}/` | `sites_update` |  |

## Sites Contact

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Related Contacts | GET | `/v3/sites/{site_id}/contacts/` | `sites_contacts_list` | Yes |
| Get Related Contact | GET | `/v3/sites/{site_id}/contacts/{id}/` | `sites_contacts_retrieve` |  |
| Link Contact | POST | `/v3/sites/{site_id}/contacts/link/` | `sites_contacts_link_create` |  |

## Storage

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many Files | GET | `/v3/storage/files/` | `storage_files_list` | Yes |
| Create File Metadata | POST | `/v3/storage/files/` | `storage_files_create` |  |
| Get File | GET | `/v3/storage/files/{id}/` | `storage_files_retrieve` |  |
| Update File Metadata | PATCH | `/v3/storage/files/{id}/` | `storage_files_partial_update` |  |
| Get File Download URL | GET | `/v3/storage/files/{id}/download/` | `storage_files_download_retrieve` |  |
| Upload File Bytes | PUT | `/v3/storage/files/{id}/upload/` | `storage_files_upload_update` |  |
| Get Many File Tags | GET | `/v3/storage/tags/` | `storage_tags_list` | Yes |
| Create File Tag | POST | `/v3/storage/tags/` | `storage_tags_create` |  |
| Get File Tag | GET | `/v3/storage/tags/{id}/` | `storage_tags_retrieve` |  |
| Replace File Tag | PUT | `/v3/storage/tags/{id}/` | `storage_tags_update` |  |
| Update File Tag | PATCH | `/v3/storage/tags/{id}/` | `storage_tags_partial_update` |  |
| Archive File Tag | DELETE | `/v3/storage/tags/{id}/` | `storage_tags_destroy` |  |

## Teams

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/teams/` | `teams_list` | Yes |
| Get | GET | `/v3/teams/{id}/` | `teams_retrieve` |  |

## Vendor Bills

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/vendor-bills/` | `vendor_bills_list` | Yes |
| Create | POST | `/v3/vendor-bills/` | `vendor_bills_create` |  |
| Get | GET | `/v3/vendor-bills/{id}/` | `vendor_bills_retrieve` |  |
| Replace | PUT | `/v3/vendor-bills/{id}/` | `vendor_bills_update` |  |
| Update | PATCH | `/v3/vendor-bills/{id}/` | `vendor_bills_partial_update` |  |
| Create Payment | POST | `/v3/vendor-bills/{id}/create-payment/` | `vendor_bills_create_payment_create` |  |
| Reverse | POST | `/v3/vendor-bills/{id}/reverse/` | `vendor_bills_reverse_create` |  |
| Upload File | POST | `/v3/vendor-bills/{id}/upload-file/` | `vendor_bills_upload_file_create` |  |
| Void | POST | `/v3/vendor-bills/{id}/void/` | `vendor_bills_void_create` |  |

## Vendor Credits

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/vendor/credits/` | `vendor_credits_list` | Yes |
| Get | GET | `/v3/vendor/credits/{id}/` | `vendor_credits_retrieve` |  |

## Vendor Payments

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/vendor/payments/` | `vendor_payments_list` | Yes |
| Get | GET | `/v3/vendor/payments/{id}/` | `vendor_payments_retrieve` |  |
| Reverse | POST | `/v3/vendor/payments/{id}/reverse/` | `vendor_payments_reverse_create` |  |
| Void | POST | `/v3/vendor/payments/{id}/void/` | `vendor_payments_void_create` |  |

## Vendors

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/vendors/` | `vendors_list` | Yes |
| Create | POST | `/v3/vendors/` | `vendors_create` |  |
| Get | GET | `/v3/vendors/{id}/` | `vendors_retrieve` |  |
| Replace | PUT | `/v3/vendors/{id}/` | `vendors_update` |  |
| Update | PATCH | `/v3/vendors/{id}/` | `vendors_partial_update` |  |
| Archive | POST | `/v3/vendors/{id}/archive/` | `vendors_archive_create` |  |
| Unarchive | POST | `/v3/vendors/{id}/unarchive/` | `vendors_unarchive_create` |  |

## Work Order Activities

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/activities/` | `work_orders_activities_list` | Yes |
| Get | GET | `/v3/work-orders/activities/{id}/` | `work_orders_activities_retrieve` |  |

## Work Order Job Costing

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Work Order Job Costing | GET | `/v3/work-orders/{id}/job-costing/` | `work_order_job_costing` |  |
| Get Many Job Costing Records | GET | `/v3/work-orders/job-costing/` | `work_orders_job_costing_list` | Yes |

## Work Order Problems

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/types/problems/` | `work_orders_types_problems_list` | Yes |
| Get | GET | `/v3/work-orders/types/problems/{id}/` | `work_orders_types_problems_retrieve` |  |

## Work Order Resolutions

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/types/resolutions/` | `work_orders_types_resolutions_list` | Yes |
| Get | GET | `/v3/work-orders/types/resolutions/{id}/` | `work_orders_types_resolutions_retrieve` |  |

## Work Order Time Log

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/time-logs/` | `work_orders_time_logs_list` | Yes |
| Get | GET | `/v3/work-orders/time-logs/{id}/` | `work_orders_time_logs_retrieve` |  |
| Get Timeline | GET | `/v3/work-orders/time-logs/{id}/timeline/` | `work_orders_time_logs_timeline_retrieve` |  |

## Work Order Types

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/types/` | `work_orders_types_list` | Yes |
| Get | GET | `/v3/work-orders/types/{id}/` | `work_orders_types_retrieve` |  |
| Get Problem/Resolution Codes | GET | `/v3/work-orders/types/{id}/problem-resolution-codes/` | `work_orders_types_problem_resolution_codes_retrieve` |  |

## Work Orders

| Action | Method | Path | Operation ID | Paginated |
| --- | --- | --- | --- | --- |
| Get Many | GET | `/v3/work-orders/` | `work_orders_list` | Yes |
| Create | POST | `/v3/work-orders/` | `work_orders_create` |  |
| Get | GET | `/v3/work-orders/{id}/` | `work_orders_retrieve` |  |
| Replace | PUT | `/v3/work-orders/{id}/` | `work_orders_update` |  |
| Update | PATCH | `/v3/work-orders/{id}/` | `work_orders_partial_update` |  |
| Cancel | POST | `/v3/work-orders/{id}/cancel/` | `work_orders_cancel_create` |  |
| Get Many Snapshots | GET | `/v3/work-orders/{workorder_id}/snapshots/` | `work_orders_snapshots_list` | Yes |
| Create Snapshot | POST | `/v3/work-orders/{workorder_id}/snapshots/` | `work_orders_snapshots_create` |  |
| Get Snapshot | GET | `/v3/work-orders/{workorder_id}/snapshots/{id}/` | `work_orders_snapshots_retrieve` |  |
| Get Current Snapshot | GET | `/v3/work-orders/{workorder_id}/snapshots/current/` | `work_orders_snapshots_current_retrieve` |  |
| Change Status | POST | `/v3/work-orders/{workorder_id}/status/` | `work_orders_status_create` |  |
