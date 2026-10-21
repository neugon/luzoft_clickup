# Customer email validation — issue #4

ClickUp: [86e35xkdz](https://app.clickup.com/t/86e35xkdz) · Client: Luzoft · Target: Sandbox

## Repository findings and scope

The repository contains no existing customer processing implementation, entry point,
or NetSuite deployment project. The only existing tracked file is a GitHub Actions
workflow, which is unchanged. Consequently, this deliverable is a reusable validation
module; it cannot enforce validation in a deployed customer flow until that flow
imports and calls it. No existing customer logic was modified.

Suggested File Cabinet path:
`SuiteScripts/Luzoft/CustomerEmailValidator.js` (source under `src/FileCabinet/`).

## Behavior and assumptions

`validateCustomerEmail(email)` throws `CUSTOMER_EMAIL_REQUIRED` for absent, empty,
or whitespace-only email, and `CUSTOMER_EMAIL_INVALID` for other malformed values.
Success returns normally without changing the input. Errors contain actionable
messages and do not include the email address.

Assumptions: the existing flow supplies a single email string; its domain must
contain at least one dot and nonempty segments. Leading or trailing whitespace is
invalid rather than silently removed. Validation uses a simple format check, not
complete RFC mailbox validation, DNS lookup, or proof of deliverability. NetSuite
may impose additional native restrictions. No custom fields or internal IDs are used.

The module uses `N/error` with no record access or network requests. No catch is
needed inside the helper: validation errors must propagate to stop the caller.
`notifyOff` suppresses unhandled-error email notifications, not the thrown error.
No logging occurs here because the helper lacks record and execution context and
should not log customer email. If the existing entry point catches errors, retain
its error handling and log function name, record ID when available (otherwise
`not created`), execution context, error name and stack without customer payloads;
then rethrow or return the flow's existing error response and exit immediately.

## Sandbox deployment and integration

1. Identify the actual customer creation script, its email input, its response
   contract, and its existing error handling in Sandbox. Back up that script.
2. Upload the module to the suggested File Cabinet path. This is a library;
   it requires no separate script record or deployment record.
3. Add the module to the existing script's `define` dependencies and matching
   callback parameters. Use the absolute dependency path
   `/SuiteScripts/Luzoft/CustomerEmailValidator` (omit `.js`).
4. Call `customerEmailValidator.validateCustomerEmail(customerEmail)` with the
   actual existing email variable before `record.create`, transforms, saves,
   external calls, or other customer creation side effects. Do not change the
   remaining processing logic. Apply the call to every relevant creation path.
5. Ensure the entry point's catch handler stops processing on failure and exposes
   the clear error through its existing response contract. A batch handler must
   stop creation for the failing item according to its existing error policy.
6. Run the checklist below in Sandbox. Promote the reviewed module and integrated
   caller through the normal release process only after Sandbox acceptance.

Illustrative insertion into the existing callback (variable names must be mapped
to the actual script; this is not a new entry point):

```javascript
customerEmailValidator.validateCustomerEmail(customerEmail);
// Existing customer creation logic follows unchanged.
```

Rollback: restore the prior caller and remove the new dependency; remove the
library only after confirming no script references it.

## Verification

Local tests: `node --test tests/customer-email-validator.test.cjs`.
They load the AMD module with a stub for `N/error`, exercise valid and invalid
inputs, and demonstrate blocking subsequent creation in a sample caller. They
do not verify a real NetSuite entry point or actual `N/error` behavior.

Sandbox checklist:

- [ ] Verify the integrated caller loads the module without dependency errors.
- [ ] `test@example.com` passes and creates the customer as before.
- [ ] `customer@company.com` passes and creates the customer as before.
- [ ] `testexample.com` fails with `CUSTOMER_EMAIL_INVALID` and the clear message.
- [ ] `test@` fails with `CUSTOMER_EMAIL_INVALID` and the clear message.
- [ ] Empty, missing, and whitespace-only email fail with `CUSTOMER_EMAIL_REQUIRED`.
- [ ] For every failed case, verify no customer or downstream creation side effect
  occurred, and the caller returned or surfaced the error without continuing.
- [ ] Verify surrounding whitespace, multiple `@` signs, and non-string values fail.
- [ ] Exercise all relevant entry paths and existing catch handlers.
- [ ] Compare a representative valid customer before and after integration:
  fields, related records, responses, and existing business behavior match.
- [ ] Confirm any error logs include available execution context and stack without
  customer email or other sensitive payloads.

Remaining limitation: end-to-end blocking and regression verification require the
missing customer processing source and a Sandbox account. No live deployment or
Sandbox execution is performed by these repository changes.
