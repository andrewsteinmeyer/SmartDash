
import { workOrderPercentComplete, completedWorkOrderItems, nonRejectedWorkOrderItems } from '/modules/work-orders.js';
import { Status, nameForWorkOrderStatus } from '/modules/status.js';

const estimateUrl = (estimateId, territoryId) => {
    return '/admin/territory/' + territoryId + '/estimate/' + estimateId;
}

const orderUrl = (estimateId, orderId) => {
    return '/admin/estimate/' + estimateId + '/order/' + orderId;
}

const initialsFromName = function(n){
    for(n=n.split(" "),t="",r=0;r in n;)t+=n[r][0]+'',r++;return t.toUpperCase()
};

Template.workOrderCard.onRendered(function () {

    // add tooltip popup to avatar
    Meteor.setTimeout(() => {
        $('.avatar-tooltip').tooltip({ trigger: "hover" });
        $('.on-hold-button').tooltip({ trigger: "hover" });
        $('.resume-button').tooltip({ trigger: "hover" });
        $('.date-tooltip').tooltip({ trigger: "hover" });
    }, 2000);

})

Template.workOrderCard.helpers({

    dispatched(order) {
        return (order.dispatch && order.dispatch.dispatchedOn);
    },

    dispatchDate(order) {
        return moment.unix(order.dispatch.dispatchedOn).format('ll');
    },

    startDate(order) {
        return moment.unix(order.startedOn).format('ll');
    },

    completedDate(order) {
        return moment.unix(order.completedOn).format('ll');
    },

    acceptedDate(order) {
        return moment.unix(order.acceptedOn).format('ll');
    },

    approvedDate(estimate) {
        if (estimate && estimate.approval) {
            return moment.unix(estimate.approval.date).format('ll');
        }
    },

    formattedAddress(estimate) {
        if (estimate.address) {
            const shortAddress = estimate.address.formatted_address.split(",",1);
            return shortAddress + (estimate.address.suite ? " Unit: " + estimate.address.suite : "");
        }
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

    percentComplete(estimate, orderId) {
        return workOrderPercentComplete(estimate, orderId);
    }, 

    completedItems(estimate, orderId) {
        const completed = completedWorkOrderItems(estimate, orderId);
        return completed ? completed.length : 0;
    },

    totalItems(estimate, orderId) {
        const total = nonRejectedWorkOrderItems(estimate, orderId);
        return total ? total.length : 0;
    },

    inProgress(order) {
        return (order.status == nameForWorkOrderStatus(Status.WorkOrder.IN_PROGRESS));
    },

    isComplete(order) {
        return (order.status == nameForWorkOrderStatus(Status.WorkOrder.PENDING_REVIEW));
    },

    isAccepted(order) {
        return (order.status == nameForWorkOrderStatus(Status.WorkOrder.COMPLETE));
    },

    isVip(estimate) {
        var vipEmails = estimate.territory.vipEmails;
        return vipEmails.includes(estimate.requesterEmail()) ? true: false
    }

})

Template.workOrderCard.events({

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