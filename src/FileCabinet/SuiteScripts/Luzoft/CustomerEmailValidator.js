/**
 * Customer email validation. Call before starting customer creation.
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['N/error'], (error) => {
    const EMAIL_FORMAT = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

    /**
     * Validate without changing the supplied email or creating any records.
     * @param {string} email Customer email from the existing processing flow.
     * @throws {SuiteScriptError} When the email is missing or malformed.
     */
    const validateCustomerEmail = (email) => {
        if (email === null || email === undefined ||
            (typeof email === 'string' && email.trim() === '')) {
            throw error.create({
                name: 'CUSTOMER_EMAIL_REQUIRED',
                message: 'Customer email is required. Provide an email before creating the customer.',
                notifyOff: true
            });
        }

        if (typeof email !== 'string' || !EMAIL_FORMAT.test(email)) {
            throw error.create({
                name: 'CUSTOMER_EMAIL_INVALID',
                message: 'Customer email has an invalid format. Use a format such as user@example.com.',
                notifyOff: true
            });
        }
    };

    return { validateCustomerEmail };
});
