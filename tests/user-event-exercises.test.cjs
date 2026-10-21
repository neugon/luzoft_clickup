const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const path = require('node:path');

const load = (file, modules) => {
    let result;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,
        '../src/FileCabinet/SuiteScripts/Luzoft/', file), 'utf8'), {
        define: (dependencies, factory) => { result = factory(...dependencies.map((id) => modules[id])); }
    });
    return result;
};
const fixture = ({ values = {}, maximum = 0, collisions = 0, saveError, params = {} } = {}) => {
    const fields = { isperson: true, firstname: 'John', salesrep: '', ...values };
    const reservations = [];
    const errors = [];
    let saves = 0;
    const script = load('CustomerCreationUE.js', {
        'N/runtime': { executionContext: 'USERINTERFACE', getCurrentScript: () => ({
            getParameter: ({ name }) => ({
                custscript_luzoft_default_sales_rep: 'configured-rep',
                custscript_luzoft_customer_code_field: 'custentity_test_code',
                custscript_luzoft_code_reservation_type: 'customrecord_test_reservation', ...params
            })[name]
        }) },
        'N/error': { create: ({ name, message }) => Object.assign(new Error(message), { name }) },
        'N/log': { error: (entry) => errors.push(entry) },
        'N/search': { Summary: { MAX: 'MAX' }, createColumn: (value) => value,
            create: () => ({ run: () => ({ getRange: () => [{ getValue: () => maximum }] }) }) },
        'N/record': { create: () => {
            const reservation = {};
            return { setValue: ({ fieldId, value }) => { reservation[fieldId] = value; },
                save: () => {
                    saves += 1;
                    if (saveError) throw saveError;
                    if (saves <= collisions) throw Object.assign(new Error('collision'), { name: 'DUP_CSTM_RCRD_ENTRY' });
                    reservations.push(reservation);
                } };
        } }
    });
    const context = { type: 'create', UserEventType: { CREATE: 'create' }, newRecord: {
        getValue: ({ fieldId }) => fields[fieldId],
        setValue: ({ fieldId, value }) => { fields[fieldId] = value; }
    } };
    return { script, context, fields, reservations, errors, saves: () => saves };
};
test('assigns default rep and JOH001; overwrites copied codes', () => {
    const f = fixture({ values: { custentity_test_code: 'OLD001' } });
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.salesrep, 'configured-rep');
    assert.equal(f.fields.custentity_test_code, 'JOH001');
    assert.equal(f.reservations[0].externalid, 'luzoft-customer-code-JOH001');
});
test('preserves supplied rep and increments prefix sequence beyond three digits', () => {
    const f = fixture({ values: { salesrep: 'chosen' }, maximum: 999 });
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.salesrep, 'chosen');
    assert.equal(f.fields.custentity_test_code, 'JOH1000');
});
test('company names and accented names follow documented prefix policy', () => {
    const f = fixture({ values: { isperson: 'F', companyname: 'Éclair Ltd' } });
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.custentity_test_code, 'ECL001');
});
test('retries collisions; bounds retries and logs exhausted failure', () => {
    const f = fixture({ collisions: 2 });
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.custentity_test_code, 'JOH003');
    const busy = fixture({ collisions: 10 });
    assert.throws(() => busy.script.beforeSubmit(busy.context), /busy/);
    assert.equal(busy.saves(), 10);
    assert.equal(busy.errors[0].details.functionName, 'beforeSubmit');
    assert.ok(busy.errors[0].details.stack);
});
test('blocks missing configuration, invalid names, and unexpected save errors', () => {
    for (const options of [
        { params: { custscript_luzoft_default_sales_rep: '' } },
        { params: { custscript_luzoft_customer_code_field: '' } },
        { values: { firstname: '李' } },
        { saveError: new Error('permission denied') }
    ]) {
        const f = fixture(options);
        assert.throws(() => f.script.beforeSubmit(f.context));
        assert.equal(f.reservations.length, 0);
        assert.equal(f.errors.length, 1);
    }
});
test('ignores non-create events', () => {
    for (const type of ['edit', 'xedit', 'delete', 'copy']) {
        const f = fixture();
        f.context.type = type;
        f.script.beforeSubmit(f.context);
        assert.equal(f.saves(), 0);
        assert.equal(f.fields.salesrep, '');
    }
});
test('logs deleted order snapshot without loading the deleted record', () => {
    const audit = [];
    const errors = [];
    const script = load('SalesOrderDeletionUE.js', {
        'N/runtime': { executionContext: 'USERINTERFACE' },
        'N/log': { audit: (entry) => audit.push(entry), error: (entry) => errors.push(entry) }
    });
    const context = { type: 'delete', UserEventType: { DELETE: 'delete' }, oldRecord: {
        id: 'test-order', getText: () => 'Example Customer',
        getValue: ({ fieldId }) => ({ entity: 'test-customer', total: 123.45, currency: 'test-currency' })[fieldId]
    } };
    script.afterSubmit({ ...context, type: 'edit' });
    assert.equal(audit.length, 0);
    script.afterSubmit(context);
    assert.equal(audit[0].details.salesOrderId, 'test-order');
    assert.equal(audit[0].details.customerName, 'Example Customer');
    assert.equal(audit[0].details.totalAmount, 123.45);
    context.oldRecord.getText = () => { throw new Error('snapshot failure'); };
    assert.throws(() => script.afterSubmit(context), /snapshot failure/);
    assert.equal(errors[0].details.recordId, 'test-order');
});
