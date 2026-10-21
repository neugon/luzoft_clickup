/**
 * Shared training configuration and diagnostics. Never logs field values.
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/log', 'N/error'], (runtime, log, error) => {
    const requireSandbox = () => {
        if (runtime.envType !== runtime.EnvType.SANDBOX) {
            throw error.create({ name: 'TRAINING_SANDBOX_ONLY',
                message: 'Module 7 is restricted to Sandbox.', notifyOff: true });
        }
    };

    const requireParameter = (name) => {
        const value = runtime.getCurrentScript().getParameter({ name });
        if (typeof value !== 'string' || !value.trim()) {
            throw error.create({ name: 'TRAINING_CONFIGURATION_REQUIRED',
                message: `Configure script parameter ${name} before testing.`, notifyOff: true });
        }
        return value.trim();
    };

    const logFailure = (functionName, recordId, failure) => {
        log.error({ title: `Module 7: ${functionName}`, details: {
            functionName, recordId: recordId || 'unavailable',
            executionContext: runtime.executionContext,
            errorName: failure.name, stack: failure.stack
        } });
    };

    return { requireSandbox, requireParameter, logFailure };
});
