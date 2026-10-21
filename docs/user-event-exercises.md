# User Event exercises — issue #11

Client: Luzoft · Target: Sandbox · ClickUp: [86dzgxx75](https://app.clickup.com/t/86dzgxx75)

## Files and behavior

Upload these source files from `src/FileCabinet/SuiteScripts/Luzoft/` to
`SuiteScripts/Luzoft/` in the File Cabinet:

- `CustomerCreationUE.js`: Customer `beforeSubmit`, CREATE only. Preserves an
  assigned Sales Rep; otherwise uses the configured default. Generates a new code
  on every creation, including creation from a copied customer. Supplied/imported
  codes are overwritten intentionally to prevent copied codes. EDIT, XEDIT, and
  DELETE do nothing. A COPY form operation is not handled until its CREATE save.
- `SalesOrderDeletionUE.js`: Sales Order `afterSubmit`, DELETE only. Uses
  `oldRecord` to audit the order internal ID, customer display name and ID, total,
  currency ID, and execution context. No deleted record load or search is needed.

The existing email validator remains unchanged and independent. There is no SDF
project in this repository; deployment and account metadata setup are manual.

## Configuration and Sandbox deployment

1. Back up relevant account configuration and review other Customer User Events,
   workflows, auto-numbering, and field sourcing for interference.
2. Select or create a stored Customer Free-Form Text custom entity field for the
   code. Record its actual script ID. Give it sufficient length for three letters
   plus an expanding numeric suffix (at least 20 characters recommended). Make it
   available on Customers and read-only to ordinary users. Do not use `entityid`
   or change native customer auto-numbering. No account field ID is assumed here.
3. Create a dedicated custom record type for permanent code reservations, using
   the standard editable Name field (no auto-numbering). Disallow duplicate names;
   verify that both duplicate names and duplicate external IDs are rejected in
   Sandbox. No custom fields are required. Record the actual record type script
   ID. Restrict access: script execution roles need search/view/create; ordinary
   users must not edit, delete, inactivate, or import reservations. Include inactive
   reservations in searches (the script deliberately has no active-only filter).
   Do not attach workflows or scripts that change reservation names or external IDs.
4. Before enabling customer creation, inspect any existing customer codes. Resolve
   duplicates and seed one reservation for **every previously allocated code**
   matching `AAA` plus digits, with Name equal to the code and External ID equal
   to `luzoft-customer-code-` plus that code. Include historical/deleted allocations
   if known. Do this during a creation freeze. Reservations are the source of the
   sequence; the script does not scan existing customers. Never reuse this record
   type for another purpose or reset/delete its records.
5. Upload the two scripts and create separate User Event script records. On the
   Customer script, define the following **new script parameters** using these
   exact IDs (these are declared configuration IDs, not assumed custom fields):

   | Parameter ID | Type | Deployment value |
   | --- | --- | --- |
   | `custscript_luzoft_default_sales_rep` | List/Record: Employee | Actual active employee eligible as a Sales Rep in this account/subsidiary |
   | `custscript_luzoft_customer_code_field` | Free-Form Text | Actual Customer Code custom entity field script ID |
   | `custscript_luzoft_code_reservation_type` | Free-Form Text | Actual dedicated reservation custom record type script ID |

6. Deploy Customer script to Customer and deletion script to Sales Order, initially
   Testing status with a restricted test audience. Set deletion log level to Audit
   or Debug. Configure execution roles/permissions to write the code field and
   create/search reservations; test with actual intended roles. Do not hardcode an
   employee internal ID in source. Apply to required execution contexts, including
   UI, CSV and web services where appropriate. CSV imports must enable server
   SuiteScript/workflows. Integrations must not bypass server scripts. Customer
   creation initiated by another User Event may not chain User Events; review such
   flows separately before claiming coverage.
7. Confirm execution ordering with other scripts. No later script/workflow may
   overwrite generated codes. After the checklist passes, review with the owner,
   then release in Sandbox. Promote files and equivalent account configuration
   through the normal approved Production process only after acceptance.

Rollback: disable these two deployments and restore prior field/form configuration.
Keep all reservations, even after rollback, so re-enabling cannot reuse old codes.

## Allocation policy, assumptions, and limitations

For individuals the prefix comes from `firstname`; for companies it comes from
`companyname`. Accent marks are removed and non-ASCII letters/punctuation/spaces
are discarded; the first three remaining Latin letters are uppercased. John Smith
and John Doe therefore share `JOH`. Names with fewer than three such letters block
creation with an actionable error. This naming/transliteration policy needs business
approval; there is no invented fallback for names in other writing systems.

The script searches the maximum numeric suffix in the reservation Name for the
prefix, then attempts to create the next reservation. An empty prefix starts at
001; 999 advances to 1000. Numeric sorting uses a summary formula so 1000 sorts
correctly. Atomic record name/external-ID uniqueness is essential: concurrent
requests can select the same suffix; a duplicate save retries the next number,
up to ten attempts, then blocks with a retry message. Unknown errors propagate
immediately. Sandbox must confirm actual duplicate error names are one of
`DUP_CSTM_RCRD_ENTRY`, `DUP_RCRD`, or `DUPLICATE_EXTERNAL_ID`. Other error names
safely block creation but require review before adding a collision classification.

Reservation saves and customer saves are separate operations. A later failure,
validation rejection, or retry can leave unused numbers. Codes are unique for
properly configured generated creations, but neither gapless numbering nor commit
order is guaranteed. Reservation history must be retained permanently. Restrict
manual code edits and seed existing values: without those controls, imported or
manually edited customers can duplicate codes outside this allocator. This does
not provide database uniqueness on arbitrary customer field edits.

One summary search and one reservation create/save are normally needed per customer;
collisions add saves. No customer or employee loads are used. At large volumes,
monitor summary-search performance, storage, governance, and contention. Required
reservation permissions and cross-script behavior need real account verification.

Errors log function name, record ID (or `not created`), execution context, error
name/message, and stack, then propagate. Customer failures block saving because
partial automation would violate the requirement. Deletion logging failures surface
after deletion has committed and cannot undo it. Audit logs contain customer names
as explicitly requested: restrict log access appropriately. NetSuite script execution
logs have limited retention and log-level/volume controls; they are reference logs,
not a permanent compliance archive. Export to an approved archive if durable
retention is later required. No archive integration is included.

## Verification

Run `node --test tests/*.test.cjs`. Tests use mocked NetSuite AMD modules and cover
rep preservation/defaulting, generated and copied codes, prefixes, suffix growth,
collision retries/exhaustion, configuration and save failures, event filtering,
and deleted snapshots/error logging. They do not establish NetSuite transaction,
search formula, permissions, uniqueness, or snapshot behavior. No live Sandbox
execution is possible from this repository.

Sandbox checklist:

- [ ] Confirm both AMD scripts load and only the intended records/events execute.
- [ ] Verify blank Sales Rep becomes the configured employee; explicit Sales Rep stays.
- [ ] Missing/ineligible default rep or missing/invalid field/type configuration blocks
  saving and produces contextual error logs. Restore valid configuration afterward.
- [ ] In a fresh prefix, create John Smith then John Doe: JOH001 then JOH002.
- [ ] Create a company and accented individual; verify documented prefixes. Test
  short and non-Latin names and verify clear blocking errors.
- [ ] Copy a customer and import a customer with a supplied code: each gets a fresh
  code. Edit/XEDIT existing customers: code and rep remain unchanged.
- [ ] Seed a different prefix through 999 and verify the next allocation is 1000.
  Confirm malformed/unrelated reservation names are absent from this dedicated type.
- [ ] Try duplicate reservation Name and External ID directly and via SuiteScript;
  verify rejection and actual error names. Do not release without this constraint.
- [ ] Submit simultaneous same-prefix creations using independent sessions/API calls;
  verify distinct codes, collision recovery, no duplicate reservations, and usable
  errors during contention. Mock tests alone cannot prove concurrency safety.
- [ ] Force customer validation to fail after reservation; confirm no customer is
  saved and its reservation remains. Retry and confirm a new number is allocated.
- [ ] Test intended UI, CSV and integration paths and roles, employee/subsidiary
  eligibility, field permissions, and interactions with other automation.
- [ ] Delete an order with a known customer, nonzero total and currency; confirm the
  Audit log matches its pre-deletion snapshot. Test zero totals and a different
  currency, if enabled. Verify `oldRecord.getText('entity')` supplies the display
  name in all enabled deletion contexts; resolve failures before release.
- [ ] Confirm create/edit orders produce no deletion log, and test a forced snapshot
  error: contextual error is logged but the deleted order is not restored.
- [ ] Review log access/retention and regression-test existing email validation and
  normal customer/order workflows. Record evidence and owner approval in the issue.
