/**
 * Default sales rep and reserve customer codes before customer creation.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/error', 'N/log'],
    (runtime, record, search, error, log) => {
        const fail = (message) => error.create({
            name: 'CUSTOMER_AUTOMATION_FAILED', message, notifyOff: true
        });
        const parameter = (name) => runtime.getCurrentScript().getParameter({ name });
        const isEmpty = (value) => value === '' || value === null || value === undefined;

        const getPrefix = (customer) => {
            const isPerson = customer.getValue({ fieldId: 'isperson' });
            const name = isPerson === true || isPerson === 'T'
                ? customer.getValue({ fieldId: 'firstname' })
                : customer.getValue({ fieldId: 'companyname' });
            // Explicit ASCII policy keeps the generated code and search prefix predictable.
            const letters = String(name || '').normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/gi, '').toUpperCase();
            if (letters.length < 3) {
                throw fail('Customer code requires at least three Latin letters in the first name (individual) or company name.');
            }
            return letters.slice(0, 3);
        };

        const reserveCode = (reservationType, prefix) => {
            const sequenceColumn = search.createColumn({
                name: 'formulanumeric', summary: search.Summary.MAX,
                formula: 'TO_NUMBER(SUBSTR({name}, 4))'
            });
            const results = search.create({
                type: reservationType,
                filters: [['formulatext: CASE WHEN REGEXP_LIKE({name}, \'^' +
                    prefix + '[0-9]+$\') THEN \'Y\' ELSE \'N\' END', 'is', 'Y']],
                columns: [sequenceColumn]
            }).run().getRange({ start: 0, end: 1 });
            let sequence = Number(results[0] && results[0].getValue(sequenceColumn) || 0);
            if (!Number.isSafeInteger(sequence) || sequence < 0) {
                throw fail('Customer code reservation sequence is invalid. Contact the administrator.');
            }
            for (let attempt = 0; attempt < 10; attempt += 1) {
                sequence += 1;
                if (!Number.isSafeInteger(sequence)) {
                    throw fail('Customer code sequence limit reached.');
                }
                const code = prefix + String(sequence).padStart(3, '0');
                const reservation = record.create({ type: reservationType, isDynamic: false });
                reservation.setValue({ fieldId: 'name', value: code });
                reservation.setValue({ fieldId: 'externalid', value: 'luzoft-customer-code-' + code });
                try {
                    reservation.save();
                    return code;
                } catch (reservationError) {
                    // External ID uniqueness arbitrates simultaneous claims atomically.
                    if (!['DUP_CSTM_RCRD_ENTRY', 'DUP_RCRD', 'DUPLICATE_EXTERNAL_ID']
                        .includes(reservationError.name)) {
                        throw reservationError;
                    }
                }
            }
            throw fail('Customer code allocation is busy. Please retry saving the customer.');
        };

        const beforeSubmit = (context) => {
            if (context.type !== context.UserEventType.CREATE) return;
            const customer = context.newRecord;
            try {
                if (isEmpty(customer.getValue({ fieldId: 'salesrep' }))) {
                    const salesRep = parameter('custscript_luzoft_default_sales_rep');
                    if (isEmpty(salesRep)) throw fail('Configure the default Sales Rep script parameter.');
                    customer.setValue({ fieldId: 'salesrep', value: salesRep });
                }
                const codeField = parameter('custscript_luzoft_customer_code_field');
                const reservationType = parameter('custscript_luzoft_code_reservation_type');
                if (!/^custentity_[a-z0-9_]+$/.test(codeField || '') ||
                    !/^customrecord_[a-z0-9_]+$/.test(reservationType || '')) {
                    throw fail('Configure the existing Customer Code field ID and code reservation record type ID.');
                }
                // Always allocate on CREATE, including copied records, to prevent copied codes.
                const code = reserveCode(reservationType, getPrefix(customer));
                customer.setValue({ fieldId: codeField, value: code });
            } catch (caughtError) {
                log.error({ title: 'CustomerCreationUE.beforeSubmit', details: {
                    functionName: 'beforeSubmit', recordId: customer.id || 'not created',
                    executionContext: runtime.executionContext,
                    name: caughtError.name, message: caughtError.message, stack: caughtError.stack
                } });
                throw caughtError;
            }
        };
        return { beforeSubmit };
    });
