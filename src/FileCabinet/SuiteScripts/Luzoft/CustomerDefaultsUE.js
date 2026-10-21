/**
 * Customer defaults and collision-resistant code allocation.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/error', 'N/log'],
    (record, search, runtime, error, log) => {
        // New script parameters, to be created on this script record (not customer fields).
        const PARAMETERS = {
            salesRep: 'custscript_luz_default_sales_rep',
            codeField: 'custscript_luz_customer_code_field',
            reservationType: 'custscript_luz_code_reservation_type'
        };
        const fail = (name, message) => {
            throw error.create({ name, message, notifyOff: true });
        };
        const getConfiguration = () => {
            const script = runtime.getCurrentScript();
            const configuration = {};
            Object.keys(PARAMETERS).forEach((key) => {
                configuration[key] = script.getParameter({ name: PARAMETERS[key] });
            });
            if (!configuration.salesRep ||
                !/^custentity_[a-z0-9_]+$/.test(configuration.codeField || '') ||
                !/^customrecord_[a-z0-9_]+$/.test(configuration.reservationType || '')) {
                fail('LUZ_CUSTOMER_CONFIGURATION',
                    'Configure the default Sales Rep, existing customer code field ID, and reservation record type ID.');
            }
            return configuration;
        };
        const getPrefix = (customer) => {
            const isPerson = customer.getValue({ fieldId: 'isperson' });
            const name = isPerson === true || isPerson === 'T'
                ? [customer.getValue({ fieldId: 'firstname' }),
                    customer.getValue({ fieldId: 'lastname' })].filter(Boolean).join(' ')
                : customer.getValue({ fieldId: 'companyname' });
            const letters = String(name || '').normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/gi, '').toUpperCase();
            if (letters.length < 3) {
                fail('LUZ_CUSTOMER_NAME',
                    'Customer name must contain at least three Latin letters to generate a code.');
            }
            return letters.slice(0, 3);
        };
        const reserveCode = (prefix, reservationType) => {
            const maximumColumn = search.createColumn({
                name: 'formulanumeric', summary: search.Summary.MAX,
                formula: "TO_NUMBER(REGEXP_SUBSTR({name}, '[0-9]+$'))"
            });
            const results = search.create({
                type: reservationType,
                filters: [['name', 'startswith', prefix]], columns: [maximumColumn]
            }).run().getRange({ start: 0, end: 1 });
            let sequence = Number(results[0] && results[0].getValue(maximumColumn)) || 0;
            for (let attempt = 0; attempt < 10; attempt += 1) {
                sequence += 1;
                if (!Number.isSafeInteger(sequence)) {
                    fail('LUZ_CODE_EXHAUSTED', 'Customer code sequence exceeds the supported range.');
                }
                const code = prefix + String(sequence).padStart(3, '0');
                const reservation = record.create({ type: reservationType, isDynamic: false });
                reservation.setValue({ fieldId: 'name', value: code });
                reservation.setValue({ fieldId: 'externalid', value: code });
                try {
                    reservation.save({ enableSourcing: false, ignoreMandatoryFields: false });
                    return code;
                } catch (failure) {
                    // Only retry an external-ID collision; permissions and other errors must surface.
                    if (!['DUP_CSTM_RCRD_ENTRY', 'DUPLICATE_EXTERNAL_ID', 'DUP_RCRD']
                        .includes(failure.name)) {
                        throw failure;
                    }
                }
            }
            fail('LUZ_CODE_CONTENTION', 'Customer code allocation is busy. Retry saving the customer.');
        };
        const beforeSubmit = (context) => {
            if (context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.COPY) {
                return;
            }
            try {
                const configuration = getConfiguration();
                const customer = context.newRecord;
                const prefix = getPrefix(customer);
                if (!customer.getValue({ fieldId: 'salesrep' })) {
                    customer.setValue({ fieldId: 'salesrep', value: configuration.salesRep });
                }
                // Generate even on copies or supplied input so imported/copied codes cannot bypass allocation.
                customer.setValue({
                    fieldId: configuration.codeField,
                    value: reserveCode(prefix, configuration.reservationType)
                });
            } catch (failure) {
                log.error({ title: 'CustomerDefaultsUE.beforeSubmit', details: {
                    functionName: 'beforeSubmit', recordId: context.newRecord.id || 'not created',
                    executionContext: runtime.executionContext, eventType: context.type,
                    errorName: failure.name, message: failure.message, stack: failure.stack
                } });
                throw failure;
            }
        };
        return { beforeSubmit };
    });
