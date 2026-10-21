# User Event exercises — issue #7

Client: Luzoft. ClickUp: [86dzgxx75](https://app.clickup.com/t/86dzgxx75).
Target: Sandbox first. No account credentials or actual internal IDs are included.

## Deliverables and behavior

- `src/FileCabinet/SuiteScripts/Luzoft/CustomerDefaultsUE.js`: Customer
  `beforeSubmit`, creation and copy only. Assigns the configured Sales Rep only
  when `salesrep` is empty. Always generates a customer code on creation, including
  copies and integrations that supply their own code. Edits, inline edits, and
  deletes are unchanged.
- `src/FileCabinet/SuiteScripts/Luzoft/SalesOrderDeletionUE.js`: Sales Order
  `afterSubmit`, delete only. Logs old record internal ID, customer display name,
  total in transaction currency, currency internal ID, and execution context at
  Audit level. Uses `getText` first, then `search.lookupFields`; no record loads.
- `tests/user-events.test.cjs`: Node tests with mocked NetSuite APIs.

The repository has no SDF project or deployment manifests. Deploy these two AMD
User Event files manually; the existing email validation module is unchanged.
Suggested File Cabinet paths are `SuiteScripts/Luzoft/CustomerDefaultsUE.js` and
`SuiteScripts/Luzoft/SalesOrderDeletionUE.js`.

## Required account configuration

No customer code field or reservation record was supplied. An administrator must
select or provision these in Sandbox and supply their actual IDs. They are not
created by these files, and deployment must wait until they exist:

1. A stored, writable Customer custom entity field of type Free-Form Text for the
   generated code. Apply it to all relevant customer stages, including leads and
   prospects if those use this deployment. Allow at least 32 characters. Remove
   user edit access after creation, prevent integrations/other scripts from
   replacing it, and review permissions for every creating role. Do not use the
   native Customer ID (`entityid`); native numbering remains independent.
2. A dedicated custom record type for code reservations. Enable a manually entered
   Name field, disable auto-numbering, allow names such as `JOH001`, and do not add
   required custom fields, workflows, or User Events. The script writes native
   `name` and `externalid` only. Use this type exclusively for these reservations.
   **Verify that duplicate external IDs on this type are rejected in Sandbox.**
   This database constraint, rather than the initial search, prevents concurrent
   creators from allocating the same code. Preserve reservations indefinitely;
   no user, integration, or cleanup job may rename, delete, or reuse them.
3. An active employee eligible as a Sales Rep in all applicable subsidiaries.
   A default is deployment-specific; if subsidiaries require different defaults,
   use mutually exclusive deployment audiences or extend the design with an
   approved subsidiary mapping before release. Never deploy overlapping Customer
   instances of this script.

Create the following **new script parameters** on the Customer script record.
These IDs are definitions for this deliverable, not claims about existing account
custom fields. Leave them without preference overrides and set deployment values.

| Parameter ID | Type | Deployment value |
| --- | --- | --- |
| `custscript_luz_default_sales_rep` | List/Record: Employee | Approved Sales Rep selected in Sandbox |
| `custscript_luz_customer_code_field` | Free-Form Text | Actual existing `custentity_…` field ID |
| `custscript_luz_code_reservation_type` | Free-Form Text | Actual dedicated `customrecord_…` type ID |

The customer field and record type IDs in local test fixtures are fictional test
inputs, not deployment IDs. No account-specific IDs are hardcoded in the scripts.

## Code allocation and assumptions

For individual customers, the name is first name plus last name; for companies,
company name is used. Latin accents are normalized, spaces/punctuation/non-Latin
characters are removed, and the first three remaining letters are uppercased.
`John Smith` becomes `JOH001`; the next `John Doe` becomes `JOH002`. Fewer than
three Latin letters blocks creation with an actionable error. Agree on another
transliteration policy before using this with names in other writing systems.

A summary search finds the maximum numeric suffix among reservation names for
that prefix. The next code is saved as a reservation with the same external ID.
A duplicate-record error advances the suffix and retries, up to ten attempts;
other failures propagate immediately. Formatting uses a minimum of three digits,
so `JOH999` is followed by `JOH1000`. Distinct prefixes each start at 001.

Reservations are permanent and can outlive a failed customer save or a repeated
beforeSubmit invocation. Gaps are expected; allocation is not a gap-free sequence.
This intentionally avoids unreliable search-then-save uniqueness on customers.
Before enabling, seed reservations for any existing customer codes, including
inactive customers. Validate that existing codes match the prefix plus numeric
suffix convention and resolve duplicates. Otherwise the allocator cannot protect
against collisions with preexisting codes. Uniqueness depends on exclusive use of
this allocator and preventing later field edits; a text field alone does not
provide a database uniqueness constraint.

Customer configuration, name, permissions, and allocation failures log entry
point, record ID when available, execution context, event type, error name,
message, and stack, and rethrow to block a save that cannot meet the requirements.
Deleted-order logging failures log the same diagnostic context without throwing:
`afterSubmit` cannot undo the deletion. Review Error logs operationally.

## Sandbox deployment

1. Review the name policy, generated-code field, reservation ownership, existing
   code migration, employee eligibility, and interaction with existing scripts
   and workflows. Export a backup of existing configuration.
2. Complete the prerequisites above. Grant creating roles search/create access
   to reservations and write access to the code field through the intended script
   execution model. Restrict reservation maintenance to administrators. Test the
   actual roles; do not assume Administrator behavior represents end users.
3. Upload both files. Create two User Event script records. Create one deployment
   applying CustomerDefaultsUE to Customer and another applying
   SalesOrderDeletionUE to Sales Order. Set the Customer parameter values above.
4. Initially use Testing status with an authorized test audience. Leave event
   filters open so the code can handle create/copy and delete respectively.
   Enable all required execution contexts, including UI, CSV, REST/SOAP and
   scripted creation where supported. Enable CSV/server SuiteScript triggers in
   integration settings; disabled triggers bypass enforcement. NetSuite does not
   chain User Events from other User Events; inventory such creation paths and
   enforce equivalent allocation explicitly before covering those paths.
5. Set logging to Audit or Debug during verification, with Audit retained for the
   deletion deployment. Enable appropriate audiences. Check ordering against
   other Customer scripts so later scripts do not replace assigned values.
6. Execute the checklist below. Only move to Released status and broader Sandbox
   audiences after review. Production promotion requires the same configuration
   in that account, its own employee selection, existing-code migration, and
   acceptance approval. No live deployment was performed here.

Rollback: disable the two deployments and restore affected configuration as
needed. Keep already assigned customer codes and reservations; do not reset the
sequence or delete reservations. Disabling automation removes its enforcement.

## Sandbox testing checklist

- [ ] With a fresh dedicated reservation type, create individual John Smith with
  blank Sales Rep: approved rep and `JOH001` are saved.
- [ ] Create John Doe with a selected rep: that rep remains and code is `JOH002`.
- [ ] Create a company and an accented name; verify the documented prefix policy.
- [ ] Copy a customer: preserve the rep and assign a fresh code. Supply a code in
  an import/API create: verify the script replaces it with an allocated code.
- [ ] Edit and inline-edit existing customers: no new reservation or defaults.
- [ ] Test missing parameters, invalid IDs, ineligible employee, insufficient
  permissions, short/non-Latin-only names: save is blocked and diagnostics exist.
- [ ] Create two customers with the same prefix simultaneously from independent
  sessions/integrations. Verify distinct saved codes and reservations, including
  actual duplicate-external-ID error names and retry behavior in this account.
  Do not release if the constraint or collision handling differs from expectations.
- [ ] Test more than ten competing allocations: failures surface clearly and a
  later retry succeeds. Verify `999` to `1000` formatting using Sandbox fixtures.
- [ ] Force a later customer validation failure; confirm no customer was saved,
  keep any reservation that remains, and confirm retry uses a fresh available code.
- [ ] Seed existing codes and confirm new allocations skip them. Confirm disabled
  or inactive reservations also remain in sequence searches in this account.
- [ ] Run customer scenarios as actual intended roles through each UI, CSV and
  integration creation path, including lead/prospect conversion where applicable.
- [ ] Delete a disposable Sales Order: Audit entry contains its internal ID,
  customer name and exact transaction total/currency. Test a zero-total order.
- [ ] Exercise customer-text fallback and lookup permission failure: fallback
  resolves the name, or an Error log identifies the lost audit entry. Deletion
  must not be presented as rolled back. Non-delete events produce no audit entry.
- [ ] Review execution log access and retention, script ordering, governance use,
  subsidiary restrictions and existing workflow regressions before approval.

## Validation and limitations

Run `node --test tests/*.test.cjs`. Tests cover defaults, preserving selected rep,
copy behavior, prefix formatting, allocation with stale searches and collisions,
bounded retries, validation failures, error propagation, deletion details and
lookup fallback/failure. Mocks do not validate NetSuite database uniqueness,
permissions, event availability or transaction behavior; Sandbox checks remain
mandatory. Normal allocation uses one aggregate search and one custom-record save;
contention adds saves, with bounded governance consumption.

Execution logs have platform retention and volume limits and contain customer
names as required by this exercise. Restrict access appropriately. They are not a
permanent financial audit archive. If durable, guaranteed deletion history is
required, agree on a separate persistence/monitoring design; `afterSubmit` logging
cannot guarantee capture during outages or block an already completed deletion.
