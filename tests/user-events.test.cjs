const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const load = (filename, modules) => {
    let exported;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,
        '../src/FileCabinet/SuiteScripts/Luzoft', filename), 'utf8'), {
        define: (dependencies, factory) => { exported = factory(...dependencies.map((id) => modules[id])); }
    });
    return exported;
};
const fixture = (options = {}) => {
    const fields = { isperson: true, firstname: 'John', lastname: 'Smith', ...options.fields };
    const reservations = new Set();
    const logs = [];
    let saves = 0;
    const parameters = {
        custscript_luz_default_sales_rep: '42',
        custscript_luz_customer_code_field: 'custentity_test_code',
        custscript_luz_code_reservation_type: 'customrecord_test_reservation',
        ...options.parameters
    };
    const script = load('CustomerDefaultsUE.js', {
        'N/runtime': { executionContext: 'TEST', getCurrentScript: () => ({
            getParameter: ({ name }) => parameters[name]
        }) },
        'N/error': { create: ({ name, message }) => Object.assign(new Error(message), { name }) },
        'N/log': { error: (entry) => logs.push(entry) },
        'N/search': {
            Summary: { MAX: 'MAX' }, createColumn: (value) => value,
            create: () => ({ run: () => ({ getRange: () => [{ getValue: () => options.maximum || 0 }] }) })
        },
        'N/record': { create: () => {
            const values = {};
            return {
                setValue: ({ fieldId, value }) => { values[fieldId] = value; },
                save: () => {
                    saves += 1;
                    if (options.failure) throw options.failure;
                    if (reservations.has(values.externalid)) {
                        throw Object.assign(new Error('Duplicate'), { name: 'DUP_CSTM_RCRD_ENTRY' });
                    }
                    reservations.add(values.externalid);
                }
            };
        } }
    });
    const context = { type: 'create', UserEventType: { CREATE: 'create', COPY: 'copy' },
        newRecord: { getValue: ({ fieldId }) => fields[fieldId],
            setValue: ({ fieldId, value }) => { fields[fieldId] = value; } } };
    return { script, context, fields, logs, saves: () => saves };
};

test('defaults rep and allocates successive codes despite stale concurrent search', () => {
    const f = fixture();
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.salesrep, '42');
    assert.equal(f.fields.custentity_test_code, 'JOH001');
    f.fields.lastname = 'Doe';
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.custentity_test_code, 'JOH002');
});
test('preserves selected rep and replaces copied code', () => {
    const f = fixture({ fields: { salesrep: '99', custentity_test_code: 'OLD001' } });
    f.context.type = 'copy';
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.salesrep, '99');
    assert.equal(f.fields.custentity_test_code, 'JOH001');
});
test('company names, accent normalization, and sequences beyond 999', () => {
    const f = fixture({ fields: { isperson: false, companyname: 'Élan Ltd' }, maximum: 999 });
    f.script.beforeSubmit(f.context);
    assert.equal(f.fields.custentity_test_code, 'ELA1000');
});
for (const type of ['edit', 'xedit', 'delete']) {
    test(`ignores ${type}`, () => {
        const f = fixture();
        f.context.type = type;
        f.script.beforeSubmit(f.context);
        assert.equal(f.saves(), 0);
    });
}
test('missing configuration and unsuitable names block saving', () => {
    for (const options of [{ parameters: { custscript_luz_default_sales_rep: null } },
        { fields: { firstname: '12', lastname: '' } }]) {
        const f = fixture(options);
        assert.throws(() => f.script.beforeSubmit(f.context));
        assert.equal(f.logs.length, 1);
        assert.equal(f.saves(), 0);
    }
});
test('permission errors are logged and rethrown without retries', () => {
    const failure = Object.assign(new Error('Permission denied'), { name: 'PERMISSION_VIOLATION' });
    const f = fixture({ failure });
    assert.throws(() => f.script.beforeSubmit(f.context), /Permission denied/);
    assert.equal(f.saves(), 1);
    assert.equal(f.logs[0].details.functionName, 'beforeSubmit');
    assert.equal(f.logs[0].details.stack, failure.stack);
});
test('contention retries are bounded', () => {
    const f = fixture({ failure: Object.assign(new Error('Duplicate'), { name: 'DUP_CSTM_RCRD_ENTRY' }) });
    assert.throws(() => f.script.beforeSubmit(f.context), { name: 'LUZ_CODE_CONTENTION' });
    assert.equal(f.saves(), 10);
});

test('deletion uses old record and preserves zero total; other events are ignored', () => {
    const audits = [];
    const script = load('SalesOrderDeletionUE.js', {
        'N/search': {}, 'N/runtime': { executionContext: 'TEST' },
        'N/log': { audit: (entry) => audits.push(entry), error: () => assert.fail('Unexpected error') }
    });
    const context = { type: 'delete', UserEventType: { DELETE: 'delete' }, oldRecord: {
        id: '123', getText: () => 'John Smith', getValue: ({ fieldId }) => fieldId === 'total' ? 0 : '1'
    } };
    script.afterSubmit(context);
    assert.equal(audits[0].details.salesOrderId, '123');
    assert.equal(audits[0].details.customerName, 'John Smith');
    assert.equal(audits[0].details.totalAmount, 0);
    script.afterSubmit({ ...context, type: 'edit' });
    assert.equal(audits.length, 1);
});
test('deletion resolves missing text by lookup and reports lookup failure without throwing', () => {
    const audits = [];
    const errors = [];
    let fail = false;
    const script = load('SalesOrderDeletionUE.js', {
        'N/search': { Type: { CUSTOMER: 'customer' }, lookupFields: () => {
            if (fail) throw new Error('Lookup denied');
            return { firstname: 'John', lastname: 'Smith' };
        } },
        'N/runtime': { executionContext: 'TEST' },
        'N/log': { audit: (entry) => audits.push(entry), debug: () => {}, error: (entry) => errors.push(entry) }
    });
    const context = { type: 'delete', UserEventType: { DELETE: 'delete' },
        oldRecord: { id: '123', getText: () => { throw new Error('Text unavailable'); }, getValue: () => '5' } };
    script.afterSubmit(context);
    assert.equal(audits[0].details.customerName, 'John Smith');
    fail = true;
    assert.doesNotThrow(() => script.afterSubmit(context));
    assert.equal(errors.length, 1);
    assert.match(errors[0].details.stack, /Lookup denied/);
});
