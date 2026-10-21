/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime', 'N/log'], (search, runtime, log) => {
    const getCustomerName = (salesOrder) => {
        try {
            const text = salesOrder.getText({ fieldId: 'entity' });
            if (text) {
                return text;
            }
        } catch (failure) {
            // Old-record text can be unavailable in some execution contexts; use a lookup.
            log.debug({ title: 'SalesOrderDeletionUE.getCustomerName fallback', details: {
                functionName: 'getCustomerName', recordId: salesOrder.id,
                executionContext: runtime.executionContext,
                errorName: failure.name, message: failure.message, stack: failure.stack
            } });
        }
        const customerId = salesOrder.getValue({ fieldId: 'entity' });
        if (!customerId) {
            throw new Error('Deleted Sales Order has no customer reference.');
        }
        const customer = search.lookupFields({
            type: search.Type.CUSTOMER, id: customerId,
            columns: ['companyname', 'firstname', 'lastname', 'entityid']
        });
        return customer.companyname || [customer.firstname, customer.lastname]
            .filter(Boolean).join(' ') || customer.entityid;
    };
    const afterSubmit = (context) => {
        if (context.type !== context.UserEventType.DELETE) {
            return;
        }
        try {
            const salesOrder = context.oldRecord;
            const customerName = getCustomerName(salesOrder);
            if (!customerName) {
                throw new Error('Customer name could not be resolved.');
            }
            log.audit({ title: 'Sales Order deleted', details: {
                salesOrderId: salesOrder.id,
                customerName,
                totalAmount: salesOrder.getValue({ fieldId: 'total' }),
                currencyId: salesOrder.getValue({ fieldId: 'currency' }),
                executionContext: runtime.executionContext
            } });
        } catch (failure) {
            // Deletion has already occurred; do not throw a misleading blocking validation error.
            log.error({ title: 'SalesOrderDeletionUE.afterSubmit', details: {
                functionName: 'afterSubmit', recordId: context.oldRecord && context.oldRecord.id,
                executionContext: runtime.executionContext, eventType: context.type,
                errorName: failure.name, message: failure.message, stack: failure.stack
            } });
        }
    };
    return { afterSubmit };
});
