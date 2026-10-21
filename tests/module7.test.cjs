const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const load = (name, dependencies) => {
    let exported;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,
        '../src/FileCabinet/SuiteScripts/Luzoft/Module7', name + '.js'), 'utf8'), {
        define: (names, factory) => { exported = factory(...names.map(id => dependencies[id])); },
        console: { error: () => {} }
    });
    return exported;
};
const setup = (envType = 'SANDBOX', parameter = 'existing_reference') => {
    const logs = [];
    const log = { error: entry => logs.push(entry), audit: entry => logs.push(entry),
        debug: entry => logs.push(entry) };
    const support = load('TrainingSupport', {
        'N/runtime': { envType, EnvType: { SANDBOX: 'SANDBOX' },
            executionContext: 'TEST', getCurrentScript: () => ({ getParameter: () => parameter }) },
        'N/error': { create: options => Object.assign(new Error(options.message), options) },
        'N/log': log
    });
    return { logs, log, support };
};

test('Sandbox gate and missing configuration fail closed', () => {
    for (const environment of ['PRODUCTION', 'BETA', 'INTERNAL']) {
        assert.throws(() => setup(environment).support.requireSandbox(), { name: 'TRAINING_SANDBOX_ONLY' });
    }
    assert.throws(() => setup('SANDBOX', ' ').support.requireParameter('parameter'),
        { name: 'TRAINING_CONFIGURATION_REQUIRED' });
});

test('client observes only configured body field without reading values', () => {
    const { log, logs, support } = setup();
    const client = load('TrainingClient', { 'N/log': log, './TrainingSupport': support });
    const context = { currentRecord: { id: '', type: 'customer' }, fieldId: 'other' };
    client.fieldChanged(context);
    assert.equal(logs.length, 0);
    client.fieldChanged({ ...context, fieldId: 'existing_reference', sublistId: 'item' });
    assert.equal(logs.length, 0);
    client.fieldChanged({ ...context, fieldId: 'existing_reference' });
    assert.equal(logs.length, 1);
});

test('UE skips deletion, looks up one field, and logs lookup errors after commit', () => {
    const { log, logs, support } = setup();
    let calls = 0;
    const script = load('TrainingUserEvent', { 'N/log': log, './TrainingSupport': support,
        'N/search': { lookupFields: options => {
            calls += 1;
            assert.equal(options.columns[0], 'existing_reference');
            throw new Error('lookup failed');
        } } });
    const context = { type: 'delete', UserEventType: { DELETE: 'delete' },
        newRecord: { id: 'test-record', type: 'customer' } };
    script.afterSubmit(context);
    assert.equal(calls, 0);
    assert.doesNotThrow(() => script.afterSubmit({ ...context, type: 'xedit' }));
    assert.equal(calls, 1);
    assert.equal(logs[0].details.functionName, 'afterSubmit');
    assert.equal(logs[0].details.recordId, 'test-record');
    assert.match(logs[0].details.stack, /lookup failed/);
});

const iterator = rows => ({ iterator: () => ({ each: callback => {
    for (const row of rows) if (!callback(...row)) break;
} }) });

test('MR loads configured search lazily, emits no row contents and reports stage failures', () => {
    const { log, logs, support } = setup();
    const searchObject = {};
    const script = load('TrainingMapReduce', { 'N/log': log, './TrainingSupport': support,
        'N/search': { load: ({ id }) => {
            assert.equal(id, 'existing_reference');
            return searchObject;
        } } });
    assert.equal(script.getInputData(), searchObject);
    let output;
    script.map({ key: 'row-key', value: 'sensitive row contents', write: entry => { output = entry; } });
    assert.equal(output.key, 'row-key');
    assert.equal(output.value, '1');
    script.summarize({ inputSummary: { error: 'input failure' },
        mapSummary: { errors: iterator([['row-key', 'map failure']]) },
        output: iterator([['row-key', '1']]), usage: 10, seconds: 1, yields: 0 });
    assert.equal(logs.at(-1).details.failedInvocations, 2);
    assert.equal(logs.at(-1).details.outputRows, 1);
    assert.doesNotMatch(JSON.stringify(logs), /sensitive row contents/);
});

test('MR never loads search outside Sandbox and propagates failures', () => {
    const { log, support } = setup('PRODUCTION');
    const script = load('TrainingMapReduce', { 'N/log': log, './TrainingSupport': support,
        'N/search': { load: () => assert.fail('must not load search') } });
    assert.throws(() => script.getInputData(), { name: 'TRAINING_SANDBOX_ONLY' });
    assert.throws(() => script.map({}), { name: 'TRAINING_SANDBOX_ONLY' });
});
