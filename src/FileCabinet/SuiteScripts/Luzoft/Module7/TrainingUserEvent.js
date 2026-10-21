/**
 * Verify the existing training field can be read after a record is saved.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/log', './TrainingSupport'], (search, log, support) => {
    const afterSubmit = (context) => {
        if (context.type === context.UserEventType.DELETE) {
            return;
        }
        const savedRecord = context.newRecord;
        try {
            support.requireSandbox();
            const trainingFieldId = support.requireParameter('custscript_lz_m7_ue_field');
            search.lookupFields({ type: savedRecord.type, id: savedRecord.id,
                columns: [trainingFieldId] });
            log.audit({ title: 'Module 7: training field lookup succeeded', details: {
                recordId: savedRecord.id, recordType: savedRecord.type,
                eventType: context.type
            } });
        } catch (failure) {
            support.logFailure('afterSubmit', savedRecord.id, failure);
            // The record is already committed. Surface failure in execution logs;
            // throwing here would misleadingly report a failed save to the user.
        }
    };

    return { afterSubmit };
});
