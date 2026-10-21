const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname,
    '../src/FileCabinet/SuiteScripts/Luzoft/CustomerEmailValidator.js'), 'utf8');
let validator;
vm.runInNewContext(source, {
    define: (dependencies, factory) => {
        assert.deepEqual(Array.from(dependencies), ['N/error']);
        validator = factory({
            create: ({ name, message }) => Object.assign(new Error(message), { name })
        });
    }
});

for (const email of ['test@example.com', 'customer@company.com', 'first.last+tag@sub.company.com']) {
    test(`accepts ${email}`, () => {
        assert.doesNotThrow(() => validator.validateCustomerEmail(email));
    });
}

for (const email of ['', '   ', '\t\n', null, undefined]) {
    test(`requires email for ${JSON.stringify(email)}`, () => {
        assert.throws(() => validator.validateCustomerEmail(email), {
            name: 'CUSTOMER_EMAIL_REQUIRED',
            message: /Customer email is required/
        });
    });
}

for (const email of ['testexample.com', 'test@', '@example.com', 'a@@example.com',
    'a@example', 'a@.com', 'a@example..com', 'a b@example.com', ' test@example.com',
    'test@example.com ', 123, {}, ['test@example.com']]) {
    test(`rejects malformed email ${JSON.stringify(email)}`, () => {
        assert.throws(() => validator.validateCustomerEmail(email), {
            name: 'CUSTOMER_EMAIL_INVALID',
            message: /Customer email has an invalid format/
        });
    });
}

test('validation failure prevents subsequent customer creation when integrated', () => {
    let creationCalls = 0;
    const processCustomer = (email) => {
        validator.validateCustomerEmail(email);
        creationCalls += 1;
    };
    assert.throws(() => processCustomer('test@'));
    assert.equal(creationCalls, 0);
    processCustomer('test@example.com');
    assert.equal(creationCalls, 1);
});
