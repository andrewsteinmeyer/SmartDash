
import { Status, isAgingStatus, nameForInvoiceStatus, dateBoundsForAgeStatus } from '/modules/status.js';
import { estimateValue, estimatesDueToday } from '/modules/estimates.js';

function getInvoiceFilter(status) {
    // exclude archived 
    var filter = {
        'archived': false,
        'excludeReporting': { $exists: false }
    };

    const territoryId = FlowRouter.getParam("territoryId");

    // filter by territory if territory exists
    if (territoryId) {
        filter["territory._id"] = territoryId;
    }

    if ( isAgingStatus(status) ) {
        // if status is aging status, query db for invoice sent status
        // this is because aging status is a pseudo status for dashboard
        // status of estimate and order remains Status.Invoice.SENT regardless of age
        // card progresses based upon age from invoiceSentOn date
        const invoiceStatus = nameForInvoiceStatus(Status.Invoice.SENT);
        const bounds = dateBoundsForAgeStatus(status);

        const orderCriteria = {
            'orders.status': invoiceStatus,
            'orders.invoiceSentOn': { $gt: bounds.lowerBound, $lte: bounds.upperBound },
        };

        // estimates still using legacy status of 'Invoice Sent'
        const estimateCriteria = {
            'status': "Invoice Sent",
            'invoiceSentOn': { $gt: bounds.lowerBound, $lte: bounds.upperBound },
        };

        // query search for either of these conditions
        const orFilter = {
            $or: [ 
                orderCriteria, 
                estimateCriteria
            ]
        }

        // add criteria to filter
        _.extend(filter, orFilter);
    
    }
    else {
        filter['status'] = status;
    }

    return filter;
}

const estimates = (status, sortOpts) => {
    // filter if user searched for a specific estimate
    var filter = Session.get("dashboardSearchFilter") || {};

    // return the estimates that have orders with this status
    const invoiceFilter = getInvoiceFilter(status);

    // combine search and invoice filter
    _.extend(filter, invoiceFilter);

    return Estimates.find(filter, { sort: sortOpts });
}

const sortNameForStatus = (status) => {
    switch (status) {
        case nameForInvoiceStatus(Status.Invoice.PAID):
            return "Invoice date";
            //TODO: Handle sorting by payment date
            //return "Paid date";
        default:
            return "Invoice date";
    }
}

const sortOptsForStatus = (status, sortOrder) => {
    switch (status) {
        case nameForInvoiceStatus(Status.Invoice.PAID):
            return {invoiceSentOn: sortOrder};
            //TODO: Handle sorting by payment date
            //return {paidOn: sortOrder};
        default:
            return {invoiceSentOn: sortOrder};
    }
}

Template.invoiceLane.onCreated(function () {

    const fields = {
        dueDate: 1,
        insertedOn: 1,
        address: 1,
        territory: 1,
        assignedById: 1,
        orders: 1,
        approval: 1,
        items: 1,
        archived: 1,
        quickBooks: 1
    }

    const status = Template.currentData().status;
    const sortOrder = -1;

    // set default sort opts for status
    const sortOpts = sortOptsForStatus(status, sortOrder);

    this.sortOpts = new ReactiveVar( sortOpts );

    //subscribe to work orders in status reactively
    //only subscribe to status for this swimlane
    //only request fields needed to display the invoice card
    this.autorun(() => {
        const dataContext = Template.currentData();
        const filter = getInvoiceFilter(dataContext.status);

        this.subscribe("invoices.inStatus", filter, fields);
    });
});

Template.invoiceLane.helpers({

    estimatesReady() {
        return Template.instance().subscriptionsReady();
    },

    estimates() {
        // return the estimates that have orders with this status
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        return estimates(status, sortOpts);
    },

    estimateCount() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        return estimates(status, sortOpts).count();
    },

    status() {
        // returns the work order status for this swimlane
        return Template.currentData().status;
    },

    sortNameForStatus() {
        const status = Template.currentData().status;
        return sortNameForStatus(status);
    },

    totalEstimatesValue() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();

        var values = _.map(estimates(status, sortOpts).fetch(), (estimate) => { return estimateValue(estimate, true) });

        if (!_.isEmpty(values)) {
            const total =  _.reduce(values, function(memo, num) { return parseFloat(memo) + parseFloat(num); });
            return total && total > 0 ? "$" + total.toLocaleString() : "";
        }
    },

    cardArgs(estimate) {

        const status = Template.currentData().status;

        if ( isAgingStatus(status) ) {
            const invoiceStatus = nameForInvoiceStatus(Status.Invoice.SENT);
            const bounds = dateBoundsForAgeStatus(status);

            // pass estimate orders within time bounds for aging swimlanes
            return {
                estimate,
                orders: _.filter(estimate.orders, (order) => {
                    return (order.status == invoiceStatus && order.invoiceSentOn > bounds.lowerBound && order.invoiceSentOn <= bounds.upperBound);
                })
            }
        }
        else {
            
            // pass estimate and orders with status
            return {
                estimate,
                orders: _.where(estimate.orders, { status: status })
            }
        }
    },

    estimatesDueToday() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        const filter = getInvoiceFilter(status);
        return estimatesDueToday(sortOpts, filter);
    },

})

Template.invoiceLane.events({

    "click #date-ascending": function(e, template) {

        const status = template.data.status;
        const sortOrder = 1;
    
        // grab sort opts for status
        const sortOpts = sortOptsForStatus(status, sortOrder);

        template.sortOpts.set(sortOpts);
    },

    "click #date-descending": function(e, template) {
        
        const status = template.data.status;
        const sortOrder = -1;
    
        // grab sort opts for status
        const sortOpts = sortOptsForStatus(status, sortOrder);

        template.sortOpts.set(sortOpts);
    },

})