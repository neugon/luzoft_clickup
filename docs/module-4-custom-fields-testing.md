# Module 4 — Sandbox acceptance checklist

Configuration: [Module 4 runbook](module-4-custom-fields.md) · Issue #13 ·
ClickUp [86e3j2wft](https://app.clickup.com/t/86e3j2wft)

Run with synthetic data in Sandbox. Use both the administrator/configuration role
and the intended training role. Capture actual script IDs in the runbook inventory
and record results below or in an approved internal test record. Do not attach
credentials, customer payloads, or real employee email addresses.

## Prerequisites

- [ ] Verify Sandbox, agreed Customer target, training form, and intended role.
- [ ] Record all actual object IDs, configuration date, and baseline form settings.
- [ ] Verify every new custom object ID follows the `_trn_` naming convention.
- [ ] Prepare two permitted synthetic employees with different valid test email
      addresses and one with no email, if the account permits it.
- [ ] Confirm the new fields have Store Value enabled and only apply to Customer.
- [ ] Confirm no production changes, workflows, or unrelated script changes occurred.

## Functional checks

For each row record Pass/Fail, tester/date, synthetic record reference, and a
sanitized screenshot or observation. A blank result is **not tested**, not passed.
Reload means navigate away and reopen the saved record, not merely refresh a UI
field. Test each field independently so one failure does not mask another.

| Check | Action | Required result | Result / evidence |
| --- | --- | --- | --- |
| Display | Create Customer using training form as training role | All seven fields visible, readable, and usable; appropriate labels and help | Not run |
| Defaults | Open a fresh unsaved Customer | Follow-up checked; Score 1; Status Not Reviewed; other training fields empty | Not run |
| Persistence | Fill notes, date, score 3, status In Review, owner; save and reopen | Every entered/stored value remains correct on the training form | Not run |
| Text required | Leave Notes empty and save through training form | Save blocked with a useful native required-field message; entering notes permits save | Not run |
| Date type | Enter a valid date in account format, then try invalid date text | Valid date persists; invalid date is rejected or cleared and cannot persist as invalid text | Not run |
| Checkbox override | Uncheck Follow-up, save, reopen | False remains false; default does not reset the edited value | Not run |
| Integer bounds | Save Score 1 and 5 separately | Both persist | Not run |
| Integer rejection | Try Score 0, 6, nonnumeric text, and a fractional value separately | Out-of-range values blocked; nonnumeric/fractional input cannot persist as an invalid integer; record any native normalization | Not run |
| Optional score | Clear Score and save with valid notes | Empty accepted because field is optional; no unexplained replacement by default | Not run |
| List values | Open Status selection and save each of its three values | Only intended training values selectable; each selection persists | Not run |
| Record reference | Select a permitted synthetic employee as Owner, save, reopen | Correct Employee reference persists | Not run |
| Initial sourcing | Select first test Owner on a new record | Owner Email matches its test email and persists after save/reopen | Not run |
| Source change | Change Owner to second test employee | Email reflects new owner; save/reopen retains expected value | Not run |
| Empty source | Select employee without email and separately clear Owner | No prior owner's email remains incorrectly attributed; document native clearing behavior | Not run |
| Existing record sourcing | On saved synthetic customer, change Owner and save/reopen | Source change works on edit as on creation; no stale attribution | Not run |
| Stored source | Change synthetic Employee email after saving customer; reopen customer without changing owner | Record observed stored-value behavior; no promise of automatic backfill; restore test employee afterward | Not run |
| Email validation | If sourced email is editable, try malformed email then valid synthetic email | Malformed email rejected; valid email persists; if not editable record N/A and reason | Not run |
| Existing Customer | Open a pre-existing synthetic customer | No automatic backfill assumed; training fields usable on chosen training form | Not run |
| Form isolation | Open/create customer on original and other affected forms | Training fields hidden there; no new mandatory-field failure caused by this exercise | Not run |
| Permissions | Repeat positive saves as intended role; inspect unrelated role | Intended role can use list/source/fields; unrelated role gets no new access; no broad employee permission added | Not run |
| Regression | Save representative synthetic customer with existing business fields | Existing validations, workflows, and save behavior still work | Not run |

If sourcing does not refresh or clear as required above, record the account's
actual behavior and investigate native sourcing settings. Do not mark the module
complete while stale values remain. Any need for scripted enforcement is a
separate design decision, not an implied implementation in this documentation.

## Review and cleanup

- [ ] Review actual IDs, settings, test results, and sanitized evidence with the
      Sandbox reviewer. Record reviewer/date and unresolved items.
- [ ] Confirm every required functional check passed; use N/A only for the
      explicitly conditional email-edit test, with a reason.
- [ ] Confirm no API/CSV enforcement or live-source refresh is being claimed.
- [ ] Leave reviewed training objects available in Sandbox if needed; otherwise
      follow the runbook's dependency-aware rollback and record what was retained.
- [ ] Record final disposition: accepted / needs changes; do not mark accepted
      with missing IDs, failed checks, or untested required behavior.

Local verification: run `node --test tests/*.test.cjs` for existing code regression.
Those tests do not validate native field configuration. All checks above require
an actual NetSuite Sandbox and remain unexecuted by this repository change.
