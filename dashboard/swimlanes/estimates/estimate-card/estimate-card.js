import { Status, nameForEstimateStatus } from '/modules/status.js';

const estimateUrl = (estimateId, territoryId) => {
    return '/admin/territory/' + territoryId + '/estimate/' + estimateId;
}

const initialsFromName = function(n){
    for(n=n.split(" "),t="",r=0;r in n;)t+=n[r][0]+'',r++;return t.toUpperCase()
};

Template.estimateCard.onRendered(function () {

    // add tooltip popup to avatar
    Meteor.setTimeout(() => {
        $('.avatar-tooltip').tooltip({ trigger: "hover" });
        $('.on-hold-button').tooltip({ trigger: "hover" });
        $('.resume-button').tooltip({ trigger: "hover" });
        $('.move-to-button').tooltip({ trigger: "hover" });
        $('.date-tooltip').tooltip({ trigger: "hover" });
    }, 2000);

})

function hoursUntilDue(unixDue) {

    let due = moment.unix(unixDue);
    let now = moment();
    return due.diff(now, 'hours');

}

Template.estimateCard.helpers({

    hoursUntilDue(estimate) {
        
        if (!estimate.dueDate) {
            return "";
        }

        let hours = estimate.dueDate ? hoursUntilDue(estimate.dueDate) : 0;

        if (hours > 0) {
            return hours + " Hours Left"
        } else {
            return -1*hours + " Hours Past Due"
        }
        
    },

    deadlineColor(estimate) {

        let hours = hoursUntilDue(estimate.dueDate)

        if (hours > 24) {
            return "#4caf50";
        } else if (hours > 12) {
            return "#ffc107";
        } else if (hours < 12) {
            return "#f44336";
        }

    },

    dueDate(estimate) {
        const time = estimate.dueDate ? estimate.dueDate : estimate.insertedOn
        return moment.unix(time).format('ll');
    },

    dueTime(estimate) {
        const time = estimate.dueDate ? estimate.dueDate : estimate.insertedOn
        return moment.unix(time).format('LT');
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

    onHoldStatus(estimate) {
        return (estimate.onHold) ? "" : "none";
    },

    inProcessStatus(estimate) {
        return (!estimate.onHold) ? "" : "none";
    },

    inReviewStatus(estimate) {
        return (estimate && estimate.status == nameForEstimateStatus(Status.Estimate.REVIEWING));
    },

    inComposingStatus(estimate) {
        return (estimate && estimate.status == nameForEstimateStatus(Status.Estimate.COMPOSING));
    },

    isVip(estimate) {
        var vipEmails = estimate.territory.vipEmails;
        return vipEmails.includes(estimate.requesterEmail()) ? true: false
    }

})

Template.estimateCard.events({

    'click .js-assign': function(e, template) {
        event.preventDefault();

        const estimateId = e.currentTarget.dataset.id;

        Session.set('selectedEstimate', estimateId);

    },

    'click #hold-estimate': function(e, template) {
        event.preventDefault();

        const estimateId = e.currentTarget.dataset.id;

        // save selected estimate id
        Session.set('selectedEstimate', estimateId);

    },

    'click #move-to-release': function(e, template) {
        event.preventDefault();

        const estimateId = e.currentTarget.dataset.id;

        // save selected estimate id
        Session.set('selectedEstimate', estimateId);

    },

    'click #move-to-review': function(e, template) {
        event.preventDefault();

        const estimateId = e.currentTarget.dataset.id;

        // save selected estimate id
        Session.set('selectedEstimate', estimateId);

    },

    'click #resume-estimate': function(e, template) {
        event.preventDefault();

        const userId = Meteor.userId();
        const estimateId = e.currentTarget.dataset.id;

        if (userId && estimateId) {

            Meteor.call("resumeEstimate", estimateId, userId, function(e,r) {

            });

        }

    },

});