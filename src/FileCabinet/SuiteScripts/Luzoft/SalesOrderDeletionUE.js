/**
 * Capture deleted sales order details from the event snapshot.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/runtime'], (log, runtime) => {
    const afterSubmit = (context) => {
        if (context.type !== context.UserEventType.DELETE) return;
        const salesOrder = context.oldRecord;
        try {
            log.audit({ title: 'Sales order deleted', details: {
                salesOrderId: salesOrder.id,
                customerId: salesOrder.getValue({ fieldId: 'entity' }),
                customerName: salesOrder.getText({ fieldId: 'entity' }),
                totalAmount: salesOrder.getValue({ fieldId: 'total' }),
                currencyId: salesOrder.getValue({ fieldId: 'currency' }),
                executionContext: runtime.executionContext
            } });
        } catch (caughtError) {
            log.error({ title: 'SalesOrderDeletionUE.afterSubmit', details: {
                functionName: 'afterSubmit', recordId: salesOrder && salesOrder.id,
                executionContext: runtime.executionContext,
                name: caughtError.name, message: caughtError.message, stack: caughtError.stack
            } });
            // Deletion has committed; surfacing failure cannot restore the order.
            throw caughtError;
        }
    };
    return { afterSubmit };
});
