/**
 * Read-only execution of the Module 6 saved search. Counts search rows.
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/log', './TrainingSupport'], (search, log, support) => {
    const getInputData = () => {
        try {
            support.requireSandbox();
            const searchId = support.requireParameter('custscript_lz_m7_search');
            return search.load({ id: searchId });
        } catch (failure) {
            support.logFailure('getInputData', null, failure);
            throw failure;
        }
    };

    const map = (context) => {
        try {
            support.requireSandbox();
            // The search row key is sufficient; never log or output row contents.
            context.write({ key: context.key, value: '1' });
        } catch (failure) {
            support.logFailure('map', null, failure);
            throw failure;
        }
    };

    const summarize = (summary) => {
        try {
            support.requireSandbox();
            let failedInvocations = 0;
            if (summary.inputSummary.error) {
                failedInvocations += 1;
                support.logFailure('getInputData', null, {
                    name: 'INPUT_STAGE_FAILED', stack: summary.inputSummary.error
                });
            }
            summary.mapSummary.errors.iterator().each((key, serializedError) => {
                failedInvocations += 1;
                support.logFailure('map', null, {
                    name: 'MAP_INVOCATION_FAILED', stack: serializedError
                });
                return true;
            });
            let outputRows = 0;
            summary.output.iterator().each(() => {
                outputRows += 1;
                return true;
            });
            log.audit({ title: failedInvocations ? 'Module 7: completed with errors' :
                'Module 7: search inspection complete', details: {
                outputRows, failedInvocations, usage: summary.usage,
                seconds: summary.seconds, yields: summary.yields,
                restarted: summary.isRestarted
            } });
        } catch (failure) {
            support.logFailure('summarize', null, failure);
            throw failure;
        }
    };

    return { getInputData, map, summarize };
});
