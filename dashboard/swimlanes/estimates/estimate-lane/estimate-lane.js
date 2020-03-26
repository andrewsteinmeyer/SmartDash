
import { estimateValue, estimatesDueToday } from '/modules/estimates.js';

function getEstimateFilter(status) {
    var filter = {
        'archived': false,
        'excludeReporting': { $exists: false },
        'status': status
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

Template.estimateLane.onCreated(function () {

    const fields = {
        dueDate: 1,
        insertedOn: 1,
        address: 1,
        territory: 1,
        status: 1,
        assignedById: 1,
        onHold: 1,
        holdNotes: 1,
        items: 1,
        archived: 1
    }

    this.sortOpts = new ReactiveVar( {dueDate: 1} );

    //subscribe to estimates in status reactively
    //only subscribe to status for this swimlane
    //only request fields needed to display the estimate card
    this.autorun(() => {
        const dataContext = Template.currentData();
        const filter = getEstimateFilter(dataContext.status);

        this.subscribe("estimates.inStatus", filter, fields);
    });
});

Template.estimateLane.helpers({

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
        // returns the estimate status for this swimlane
        return Template.currentData().status;
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

    estimatesDueToday() {
        const status = Template.currentData().status;
        const sortOpts = Template.instance().sortOpts.get();
        const filter = getEstimateFilter(status);
        return estimatesDueToday(sortOpts, filter);
    },

})

Template.estimateLane.events({

    "click #date-ascending": function(e, template) {

        template.sortOpts.set({dueDate: 1});
    },

    "click #date-descending": function(e, template) {
        
        template.sortOpts.set({dueDate: -1});
    },

})