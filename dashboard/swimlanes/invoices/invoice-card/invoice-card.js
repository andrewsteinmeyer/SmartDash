
import { estimateValue } from '/modules/estimates.js';

const estimateUrl = (estimateId, territoryId) => {
    return '/admin/territory/' + territoryId + '/estimate/' + estimateId;
}

const orderUrl = (estimateId, orderId) => {
    return '/admin/estimate/' + estimateId + '/order/' + orderId;
}

const initialsFromName = function(n){
    for(n=n.split(" "),t="",r=0;r in n;)t+=n[r][0]+'',r++;return t.toUpperCase()
};

const dayLimit = () => {
    return 90;
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

Template.invoiceCard.onRendered(function () {

    // add tooltip popup to avatar
    Meteor.setTimeout(() => {
        $('.avatar-tooltip').tooltip({ trigger: "hover" });
        $('.on-hold-button').tooltip({ trigger: "hover" });
        $('.resume-button').tooltip({ trigger: "hover" });
        $('.date-tooltip').tooltip({ trigger: "hover" });
    }, 2000);

})

Template.invoiceCard.helpers({

    invoiceDate(estimate) {
        return moment.unix(estimate.invoiceSentOn).format('ll');
    },

    formattedAddress(estimate) {
        if (estimate.address) {
            const shortAddress = estimate.address.formatted_address.split(",",1);
            return shortAddress + (estimate.address.suite ? " Unit: " + estimate.address.suite : "");
        }
    },

    noOrders(estimate) {
        return (estimate && !estimate.orders);
    },

    multipleOrders(orders) {
        return _.size(orders) > 1;
    },

    estimateUrl(estimate) {
        if (estimate.territory) {
            return estimateUrl(estimate._id, estimate.territory._id);
        }
    },

    orderUrl(estimate, order) {
        return orderUrl(estimate._id, order._id);
    },

    territoryName(estimate) {
        if (estimate.territory) {
            return estimate.territory.title;
        }
    },

    assignedUser(estimate) {
        if (estimate && estimate.assignedById) {
            return Meteor.users.findOne(estimate.assignedById);
        }
    },

    userInitials(user) {
        if (user && user.profile) {
            return initialsFromName(user.profile.name);
        }
    },

    onHoldStatus(order) {
        return (order.onHold) ? "" : "none";
    },

    inProcessStatus(order) {
        return (!order.onHold) ? "" : "none";
    },

    daysLapsed(estimate) {
        if (estimate) {
            return getAgeForEstimate(estimate);
        }
    }, 

    percentComplete(estimate) {
         if (estimate) {
            const daysLapsed = getAgeForEstimate(estimate);
            const totalDays = dayLimit();

            return Math.round(daysLapsed / totalDays * 100);
        }
        return 0;
    },

    totalDays() {
        return dayLimit();
    },

    processedWithStripe(payment) {
        return (payment && payment.type && payment.type == "Stripe");
    },

    hasPayments(estimate) {
        return (estimate && estimate.quickBooks && estimate.quickBooks.payments);
    },

    estimateValue(estimate) {
        const total = estimateValue(estimate, true);
        return "$" + total.toLocaleString();
    },

    isVip(estimate) {
        var vipEmails = estimate.territory.vipEmails;
        return vipEmails.includes(estimate.requesterEmail()) ? true: false
    }

})

Template.invoiceCard.events({

    'click .js-assign': function(e, template) {
        event.preventDefault();

        const estimateId = e.currentTarget.dataset.id;

        // save selected estimate id
        Session.set('selectedEstimate', estimateId);

    },

    'click #hold-workorder': function(e, template) {
        event.preventDefault();

        const workOrderId = e.currentTarget.dataset.id;
        const estimateId = e.currentTarget.dataset.instance;

        // save selected work order id and estimate id
        Session.set('selectedWorkOrder', {"orderId": workOrderId, "estimateId": estimateId} );

    },


    'click #resume-workorder': function(e, template) {
        event.preventDefault();

        const userId = Meteor.userId();
        const workOrderId = e.currentTarget.dataset.id;
        const estimateId = e.currentTarget.dataset.instance;

        if (userId 
            && workOrderId
            && estimateId) {

            Meteor.call("resumeWorkOrder", estimateId, workOrderId, userId, function(e,r) {

            });

        }

    },

});