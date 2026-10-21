# Module 7 – SuiteScript Programming

Issue #15 · Luzoft · [ClickUp 86e3j2wx0](https://app.clickup.com/t/86e3j2wx0) · Sandbox only

## Scope and assumptions

The repository already contains a customer email validation library and Node tests.
Those files are unchanged. There was no SDF project or training entry point.
The task names three script types but supplies no detailed business behavior,
record type, Module 4 field ID, or Module 6 saved search ID. This implementation
therefore assumes a read-only training exercise. Confirm this behavior with the
trainer before acceptance; no data update or business validation is inferred.

Use an existing searchable record type with the existing Module 4 **body field**.
The field must support `search.lookupFields`. Use a small, non-summary Module 6
saved search for initial testing. Search rows may repeat a record, so the count is
rows, not unique records. No custom record or custom field is created. The IDs
below are new **script configuration parameters**, not invented business field IDs.
Actual field/search references must come from Modules 4 and 6.

## Files and behavior

Source and File Cabinet paths correspond under `src/FileCabinet/`:

| File in `SuiteScripts/Luzoft/Module7/` | Behavior |
| --- | --- |
| `TrainingSupport.js` | Shared Sandbox guard, required configuration and error diagnostics. No script record needed. |
| `TrainingClient.js` | `fieldChanged` logs changes to the configured body field without reading or logging its value. Does not block edits. |
| `TrainingUserEvent.js` | `afterSubmit` uses one `lookupFields` call after non-delete saves, including inline edits. Logs success without field values. |
| `TrainingMapReduce.js` | `getInputData` returns the loaded search for framework paging. `map` emits an opaque row key and count marker; `summarize` counts outputs and reports input/map errors and governance. No reduce stage is needed. |

All entry points check Sandbox before data access. Client and UE failures are
logged without blocking user actions; UE runs after commit and cannot undo a save.
MR input/map failures are logged and rethrown for framework handling; summarize
reports stage failures, so a platform status of Complete alone is not acceptance.
Error logs include function, record ID when available, execution context and stack.
MR has no guaranteed record ID (search rows may not represent single records), so
it reports `unavailable`. Do not put sensitive values in exception messages.

No record is loaded or updated. UE lookup consumes the standard lookup governance;
MR delegates search iteration and yielding to NetSuite. Each map writes a small
output marker. Retries/restarts can affect counts: this is a training diagnostic,
not a billing or reconciliation total. Narrow the search for testing and inspect
restart/error indicators before comparing counts.

## Development environment and SDF

1. Complete Modules 4 and 6. Obtain the exact record type, body field ID, saved
   search reference, approved test records and trainer's expected behavior.
2. Install a supported Node.js LTS version, the Oracle SuiteCloud CLI for Node.js,
   and VS Code with Oracle's SuiteCloud Extension. Check the current Oracle
   compatibility matrix rather than assuming any installed Node version is supported.
   CLI installation: `npm install -g @oracle/suitecloud-cli`.
3. Enable SuiteScript client/server features and SuiteCloud Development Framework
   in Sandbox through an administrator. Use an authorized least-privilege role
   that can manage training scripts, access the selected records/field and run
   the saved search. Do not default to Administrator execution.
4. Open the repository in VS Code. `suitecloud.config.js` selects `src` as the
   account customization project; `src/manifest.xml` identifies the project.
   Authenticate interactively using `suitecloud account:setup` and select the
   Sandbox account with `suitecloud account:manageauth` as supported by your CLI.
   Keep authentication material local; never commit credentials, tokens,
   account-specific auth files or browser authorization output.
5. Run `suitecloud project:validate` and resolve account validation errors before
   `suitecloud project:deploy`. Confirm the target account is Sandbox for each
   command. The runtime guard does not prevent uploading files to a wrong account.
   Use `suitecloud <command> --help` for installed-version options.

The deploy file intentionally uploads only the four Module 7 files. The existing
email validator is outside that deployment selection. Script/deployment XML is
not fabricated without the target record type: create the configured records below
in Sandbox, then import them with SuiteCloud's object import workflow if repeatable
object deployment is needed. Review imported XML for account dependencies and
sensitive defaults before committing. Current SDF deployment uploads code only;
it does **not** create the three script records or complete the module by itself.

## Sandbox script records and deployments

Create script records from Customization > Scripting > Scripts > New using each
entry point file. Let NetSuite detect the script type. Use names prefixed with
`Luzoft Module 7`; the shared library needs no script record.

On each script's Parameters tab create the following Free-Form Text parameter,
without a preference scope, and supply its value on the deployment Parameters tab:

| Script | Parameter ID to create | Value supplied by trainer |
| --- | --- | --- |
| Client | `custscript_lz_m7_client_field` | Exact existing Module 4 body field ID |
| User Event | `custscript_lz_m7_ue_field` | Same existing body field ID |
| Map/Reduce | `custscript_lz_m7_search` | Existing Module 6 saved search script ID, or numeric ID as text |

1. Deploy Client and UE to the trainer's chosen record type. Set Deployed checked,
   status Testing and Log Level Debug. Limit the audience to authorized testers;
   Testing status can further restrict execution to the script owner. Start with
   an owner testing their own deployment, then confirm audience behavior. Confirm
   the field appears and is editable on the chosen form. Attach the Client through
   its script deployment; form-attached clients have different logging behavior.
2. Keep the UE enabled only for required test execution contexts and do not filter
   out the create/edit/xedit events needed for testing. The code skips delete.
3. Deploy MR with status Testing, no recurring schedule, concurrency 1 and a
   supported Buffer Size of 1. Set Log Level Debug, the saved search parameter,
   and the intended execution role. Confirm that role can run the search and read
   all results; counts reflect that role's permissions. Submit manually using
   Save and Execute. The search should use the Module 4 field as a column or
   criterion to connect the prerequisite exercises.
4. Use only designated training records and small search result sets. Capture
   deployment references and test evidence for trainer review. Do not deploy or
   schedule this training project in Production.

Rollback: disable the three deployments, cancel queued MR executions and allow or
cancel running executions using NetSuite's supported controls. Remove script
records/files only after confirming no dependencies. No data rollback is needed
for these scripts; restore any manual test edits through normal record controls.

## Debugging and governance exercise

Use browser developer tools with a breakpoint in `fieldChanged`; inspect field ID
and record ID without copying customer data into evidence. Check browser console
and the script execution log (client logging availability varies by attachment).
Use the SuiteScript Debugger in Sandbox with a compatible SuiteScript 2.1 debugging
session for server code; follow Oracle's debugger instructions for entry point
scripts. Do not replace deployed AMD `define` modules with debugger-only code.

Inspect UE execution logs after save. Inspect MR deployment status, stage errors,
summary counts, usage, seconds and yields. Increase a safe search result set to
observe framework yielding; do not create loops or force governance exhaustion.
Use a nonexistent search reference to exercise configuration failure, then restore
it. Inspect failed stage logs even when NetSuite reports the overall run complete.

## Verification and Sandbox acceptance

Local command: `node --test tests/*.test.cjs`. The new tests mock NetSuite AMD
modules and cover environment/configuration guards, field selection, delete/xedit,
lookup failures, lazy search loading, output privacy and stage error summaries.
They do not validate SDF schemas or actual NetSuite permissions/lifecycle behavior.

- [ ] Trainer confirms the read-only behavior, target record and Module 4/6 IDs.
- [ ] SDF validation succeeds against Sandbox; all four files upload successfully.
- [ ] All three script records and deployments load without dependency errors.
- [ ] Client: change the training body field; observe one diagnostic and no
      automatic data changes. Change another field/sublist; no diagnostic occurs.
- [ ] Client: test a new unsaved record; no missing-ID error. Remove its parameter;
      observe configuration diagnostics while edits remain possible. Restore it.
- [ ] UE: create, edit and inline-edit approved records; lookup succeeds and logs
      contain ID/type/event but no field values. Delete an expendable test record;
      no lookup is attempted.
- [ ] UE: temporarily use an invalid field ID or restricted test role; verify an
      error with function/context/ID/stack and that the committed save is not
      misleadingly reported as blocked. Restore valid configuration.
- [ ] MR: run empty, one-row and small multi-row searches; compare outputRows with
      the same search under the execution role. Verify source records unchanged.
- [ ] MR: remove the parameter, use an invalid search, and test search permission
      denial; confirm errors are visible and do not count these runs as success.
- [ ] Restore configuration and rerun successfully. If restarted/retried, inspect
      errors and counts; do not assume outputRows is an exactly-once record count.
- [ ] Verify environment guard in local tests; do not deploy to Production to test it.
- [ ] Review governance, audience, execution contexts, logs and existing validator
      regression tests. Record Sandbox account/environment, deployment references,
      role, expected/actual counts, execution IDs, date and trainer approval without
      credentials or customer values.
- [ ] Trainer reviews code and signs off all three working Sandbox deployments.

Module completion requires the final checkbox; repository tests alone do not
establish that these scripts are deployed or work in an account. No live Sandbox
access, SDF CLI validation or trainer review was available during implementation.

## References and approximate ten-hour plan

Use the [Oracle NetSuite Help Center](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/index.html)
and search the exact topics “SuiteScript 2.x API Introduction”, “SuiteScript 2.x
Script Types”, “Script Governance”, “Map/Reduce Script Type”, “SuiteCloud Development
Framework” and “SuiteCloud Extension for Visual Studio Code”. Check current
`N/runtime`, `N/search`, `N/log` and debugging documentation for account limitations.

Suggested allocation: environment/SDF setup 2 hours; Client 1.5 hours; UE 1.5 hours;
MR 2 hours; deployment/debugging/checklist 2 hours; trainer review 1 hour.
