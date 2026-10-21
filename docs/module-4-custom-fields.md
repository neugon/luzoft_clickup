# Module 4 – Custom Fields — issue #13

Client: Luzoft · Environment: **Sandbox only**  
ClickUp: [86e3j2wft](https://app.clickup.com/t/86e3j2wft)

## Deliverable and scope

This is a native NetSuite configuration runbook, with a companion
[Sandbox acceptance checklist](module-4-custom-fields-testing.md). It creates a
small training exercise covering multiple field types, a custom list, a
list/record reference, sourcing, defaults, and native validation. No SuiteScript
is needed. The issue's “Advanced PDF / HTML Template” classification does not
provide a template requirement; a template cannot configure record fields.
No PDF template, script record, or script deployment is included.

No account changes have been made. This repository has no SDF project or approved
field inventory. Creating deployable XML would require inventing object IDs and
account dependencies. The configuration below is a proposed exercise, not a claim
that these fields or IDs already exist.

## Assumptions and setup decisions

- Use **Customer** as the proposed target record, pending confirmation by the
  Sandbox implementer. The task does not specify a target. If a different target
  is required, revise this matrix and its tests before creating objects.
- Use a dedicated copy of a Customer entry form for training. Confirm which
  Customer forms, roles, integrations, workflows, and scripts exist before
  changing configuration. A separate form limits UI exposure, but entity fields
  still exist on the underlying record and may be visible to APIs and automation.
- Use only synthetic customers and test employees. Employee references require
  suitable role permissions; do not use or copy employee personal data.
- All new custom objects, including the copied form and custom list, must use
  script IDs containing the `_trn_` training prefix after their native object
  prefix. `custbody_trn_approval_notes` is the issue's example only, not an entity
  field ID to create. Record the actual IDs assigned/configured in Sandbox below.
  No full custom script IDs or internal IDs are assigned by this deliverable.
- Native required, numeric, and email validation are sufficient for this exercise.
  No cross-field business validation or automation is assumed.
- Target duration is about four hours: discovery 30 minutes, configuration
  90 minutes, testing 90 minutes, evidence and cleanup review 30 minutes.

## Proposed configuration and actual-object inventory

Labels below are proposed training labels, not script IDs. Keep every field's
**Store Value** enabled so successful saves can be verified after reload. Use
normal editable display unless explicitly stated. Restrict field access to the
training role and administrators as supported by account permissions. Do not
make fields globally mandatory. Do not enable global search or expose fields on
unrelated entity types or forms.

| Proposed label | Native object / field type | Configuration | Actual script ID / internal ID |
| --- | --- | --- | --- |
| Training Customer Entry | Custom Customer entry form | Copy a suitable existing form; not preferred globally; explicitly select for training | To capture in Sandbox |
| Training Review Status | Custom list | Values: Not Reviewed, In Review, Complete; no selected default at list level | To capture in Sandbox |
| Training Notes | Entity field / Free-Form Text | Applies To Customer only; no default; required only on training form | To capture in Sandbox |
| Training Review Date | Entity field / Date | Applies To Customer only; no default; optional | To capture in Sandbox |
| Training Follow-up Needed | Entity field / Check Box | Applies To Customer only; default checked; optional | To capture in Sandbox |
| Training Score | Entity field / Integer Number | Applies To Customer only; default 1; minimum 1, maximum 5 on Validation & Defaulting | To capture in Sandbox |
| Training Status | Entity field / List/Record | Applies To Customer only; List/Record = actual Training Review Status list; default Not Reviewed | To capture in Sandbox |
| Training Owner | Entity field / List/Record | Applies To Customer only; List/Record = Employee; no default | To capture in Sandbox |
| Training Owner Email | Entity field / Email Address | Applies To Customer only; Source List = actual Training Owner field; Source From = Employee email; no independent default | To capture in Sandbox |

Also record the Sandbox account/environment identifier (non-secret), form used,
implementation date, implementer, test role, and any account-specific differences.
Never put credentials or authentication material into this inventory or evidence.

## Sandbox configuration procedure

1. Verify the account is Sandbox before any changes. Review existing training
   objects and reuse only those whose purpose and configuration match this task.
   Capture baseline form configuration and any reused object's dependencies.
   Record existing scripts/workflows that run on Customer save.
2. Under **Customization > Lists, Records, & Fields > Lists > New**, create the
   training review-status list and its three values. Set its script ID to follow
   the required naming convention and capture its actual ID. Do not substitute
   labels for internal IDs in deployment tools or scripts.
3. Under **Customization > Forms > Entry Forms**, customize/copy the chosen
   Customer form. Give it the training name and compliant script ID. Keep the
   original form intact and do not set the training form as the global preferred
   form. Check role-level form availability and preferred-form overrides.
4. Under **Customization > Lists, Records, & Fields > Entity Fields > New**,
   create the fields from the matrix. Confirm **Applies To: Customer** only.
   Enter a compliant script ID for each and record the resulting actual IDs.
   Set help text explaining that each field is for Sandbox training. Configure
   defaults by selecting actual values in the UI; do not type guessed numeric IDs.
5. Create Training Owner before Training Owner Email. In the email field's
   **Sourcing & Filtering** tab, select Training Owner in **Source List**, then
   the Employee email field in **Source From**. Keep Store Value enabled and
   disable **Source Filter By** unless an account-specific dependency requires it.
   Do not add a formula or a default to this sourced field. Confirm the native UI
   offers this source relationship for the selected field types before saving.
6. On Training Score, configure minimum 1 and maximum 5 in the native validation
   settings. If those controls or the required source relationship are unavailable
   in this account, stop that part of the exercise and record the gap. Do not
   report validation/sourcing as complete or invent replacement script IDs. A
   scripted replacement requires an agreed entry point and separate implementation.
7. On the copied form's custom-field controls, show the training fields in a
   sensible order (owner before owner email) and mark Training Notes mandatory
   **on this form only**. Keep other fields optional. Confirm fields are hidden
   on other active Customer forms using their form-specific controls; inspect all
   affected forms because creating entity fields can affect more than one form.
8. Review field access/search access, custom-list access where available, and form
   access using the training role. Employee selection may expose employee names;
   use only appropriately permitted test users. Avoid granting broad employee
   access solely to make the exercise pass.
9. Save configuration, complete the companion checklist, and capture evidence.
   Resolve every failed check before marking the module complete.

UI labels and navigation may vary with account release and role. Use NetSuite's
field help for the actual controls in the Sandbox; document deviations.

## Behavior and maintenance

Defaults supply initial values for new records; they are not backfills for
existing customers. Do not mass update existing records as part of this task.
The status list limits selection to configured values. Integer and range
validation constrain Training Score. Form-level required notes demonstrate UI
validation while avoiding a new account-wide required field. That form constraint
does not promise enforcement through CSV imports, web services, or SuiteScript.

Training Owner Email demonstrates sourcing from the selected employee. With
Store Value enabled it is a saved value, not a live view of Employee. Do not
assume employee-email edits refresh existing customers. Test selection, owner
changes, clearing, and save/reload in this account; record observed behavior.
If the UI permits editing the sourced email, test its native email validation.
Do not treat the sourced value as an authoritative business contact address.

No custom exception handling, logs, record loads, or governance consumption are
introduced. NetSuite displays native validation messages. Investigate unexpected
save errors using existing Sandbox script/workflow logs without capturing
customer payloads or personal employee data in repository evidence.

## Deployment, rollback, and limitations

Deployment for this issue means manual configuration **in Sandbox only** using
this runbook and the actual-object inventory. There is no upload/install command
and no live deployment was performed. Preserve evidence of configuration and
results so a reviewer can reproduce the exercise.

For cleanup, first identify dependencies and any training data that must be
retained. Restore users' prior form selection and remove training-form access.
Clear test references where appropriate, then inactivate training fields, the
training form, and the custom list in dependency order (sourced email before
owner; status field before list). If an object cannot be inactivated through its
UI, hide/remove its access and document it for controlled cleanup. Do not delete
shared or reused objects. Deleting fields can permanently lose stored data;
prefer inactivation and retain the inventory for later review.

Production rollout is outside this Sandbox-only task. Any later rollout needs an
approved target-record/field design, captured real object IDs, dependency-aware
migration packaging, and separate release review. Do not copy Sandbox internal
IDs into another account.

Known limits: target record and field contents are assumptions; sourcing behavior,
permissions, form visibility, and native validations require real Sandbox testing.
No filtering relationship was specified, so no arbitrary source filter is added.
There is no automated configuration or live-account verification. The module is
complete only when every required check passes and the actual IDs and evidence
have been recorded.

Reference: [Oracle NetSuite Help Center](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/index.html),
search **Custom Fields**, **Custom Lists**, and **Sourcing and Filtering**. Consult
current account help before configuration; these references are not a claim of
live documentation verification.
