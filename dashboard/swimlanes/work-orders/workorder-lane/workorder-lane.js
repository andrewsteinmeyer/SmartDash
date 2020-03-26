
import { estimateValue, estimatesDueToday } from '/modules/estimates.js';
import { Status, nameForWorkOrderStatus } from '/modules/status.js';

function getEstimateFilter(status) {
    var filter = {
        'archived': false,
        'excludeReporting': { $exists: false },
        'orders.status': status
    };

    const territoryId = FlowRouter.getParam("territoryId");

    // filter by territory if territory exists
    if (territoryId) {
        filter["territory._id"] = territoryId;
    }

    return filter;
}

const estimates = (status, sortOpts) => {
    // filter if user searched for a specific estimate
    var filter = Session.get("dashboardSearchFilter") || {};

    // return the estimates that have orders with this status
    const estimateFilter = getEstimateFilter(status);

    // combine search and estimate filter
    _.extend(filter, estimateFilter);

    return Estimates.find(filter, {sort: sortOpts} )  
}

const sortNameForStatus = (status) => {
    switch (status) {
        case nameForWorkOrderStatus(Status.WorkOrder.APPROVED):
            return "Approval date";
        default:
            //TODO: Sort by dispatch date on an order level
            //return "Dispatch Date"
            return "Approval date";
    }
}

const sortOptsForStatus = (status, sortOrder) => {
    switch (status) {
        case nameForWorkOrderStatus(Status.WorkOrder.APPROVED):
            return {"approval.date": sortOrder};
        default:
            //TODO: Sort by dispatch date on an order level
            //return "order.dispatched.dispatchedOn"
            return {"approval.date": sortOrder};
    }
}

Template.workOrderLane.onCreated(function () {

    const fields = {
        dueDate: 1,
        insertedOn: 1,
        address: 1,
        territory: 1,
        assignedById: 1,
        orders: 1,
        approval: 1,
        items: 1,
        archived: 1
    }

    const status = Template.currentData().status;
    const sortOrder = -1;

    // set default sort opts for status
    const sortOpts = sortOptsForStatus(status, sortOrder);

    this.sortOpts = new ReactiveVar( sortOpts );

    //subscribe to work orders in status reactively
    //only subscribe to status for this swimlane
    //only request fields needed to display the work order card
    this.autorun(() => {
        const dataContext = Template.currentData();
        const filter = getEstimateFilter(dataContext.status);

        this.subscribe("workOrders.inStatus", filter, fields);
    });
});

Template.workOrderLane.helpers({

    estimatesReady() {
        return Template.instance().subscriptionsReady();
    },

    estimates() {
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
        return {
            estimate,
            orders: _.where(estimate.orders, {status: Template.currentData().status })
        }
    },

    estimatesDueToday() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        const filter = getEstimateFilter(status);
        return estimatesDueToday(sortOpts, filter);
    },
})

Template.workOrderLane.events({

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