/**
 * Observe changes to the existing Module 4 body field without altering data.
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log', './TrainingSupport'], (log, support) => {
    const fieldChanged = (context) => {
        try {
            support.requireSandbox();
            const trainingFieldId = support.requireParameter('custscript_lz_m7_client_field');
            if (!context.sublistId && context.fieldId === trainingFieldId) {
                log.debug({ title: 'Module 7: training field changed', details: {
                    recordId: context.currentRecord.id || 'unsaved',
                    recordType: context.currentRecord.type
                } });
            }
        } catch (failure) {
            support.logFailure('fieldChanged', context.currentRecord.id, failure);
            // No business validation was requested; do not block user edits.
            // Browser diagnostics remain available when client N/log is suppressed.
            console.error('Module 7 fieldChanged failed; check deployment configuration.',
                failure.name);
        }
    };

    return { fieldChanged };
});
