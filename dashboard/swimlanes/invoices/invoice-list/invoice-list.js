

import { Status, isAgingStatus, nameForInvoiceStatus, dateBoundsForAgeStatus } from '/modules/status.js';
import { estimateValue } from '/modules/estimates.js';

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

const estimateUrl = (estimateId, territoryId) => {
    return '/admin/territory/' + territoryId + '/estimate/' + estimateId;
}

const getAgeForEstimate = (estimate) => {
    if (estimate && estimate.invoiceSentOn) {
        const end = moment();
        const start = moment.unix(estimate.invoiceSentOn);
        const duration = moment.duration(end.diff(start));

        return Math.round(duration.as('days'));
    }
    else {
        return 0;
    }
}

Template.invoiceList.onCreated(function () {

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

    //only subscribe to status for this list group
    //only request fields needed to display the invoice card
    this.autorun(() => {
        const dataContext = Template.currentData();
        const filter = getInvoiceFilter(dataContext.status);

        this.subscribe("invoices.inStatus", filter, fields);
    });
});

Template.invoiceList.helpers({

    estimatesReady() {
        return Template.instance().subscriptionsReady();
    },

    estimates() {
        // return the estimates that have orders with this status
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        return estimates(status, sortOpts);
    },

    status() {
        // returns the work order status for this swimlane
        return Template.currentData().status;
    },

    formattedAddress(estimate) {
        if (estimate.address) {
            const shortAddress = estimate.address.formatted_address.split(",",1);
            return shortAddress + (estimate.address.suite ? " Unit: " + estimate.address.suite : "");
        }
    },

    estimateUrl(estimate) {
        if (estimate.territory) {
            return estimateUrl(estimate._id, estimate.territory._id);
        }
    },

    daysLapsed(estimate) {
        if (estimate) {
            return getAgeForEstimate(estimate);
        }
    }, 

    invoiceDate(estimate) {
        return moment.unix(estimate.invoiceSentOn).format('ll');
    },

    estimateValue(estimate) {
        const total = estimateValue(estimate, true);
        return "$" + total.toLocaleString();
    },

    invoiceAmt(estimate) {
        if (estimate && estimate.quickBooks && estimate.quickBooks.invoiceAmt) {
            const amount = estimate.quickBooks.invoiceAmt
            return "$" + amount.toLocaleString();
        }
    },

    territoryName(estimate) {
        if (estimate.territory) {
            return estimate.territory.title;
        }
    },

    estimateCount() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        return estimates(status, sortOpts).count();
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

    getClients(estimate) {
        if (!estimate || !estimate.contacts) return "";
        const clients = _.reject(estimate.contacts, (contact) => { return contact.isRequester });

        var clientString = "";

        // TODO: Make formatting smarter when more than one client
        _.each(clients, (client => {
            clientString += client.firstName + " " + client.lastName + " "
        }))

        return clientString;
    }
    

})