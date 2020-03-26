
import { estimate_statuses, workorder_statuses, invoice_statuses, moveStatusesForEstimateStatus } from '/modules/status.js';

const listViewStyle = {
    'backgroundColor': "#FAFBFD",
    'headerColor': "#000000",
    'pretitleColor': "#000000"
}

const columnViewStyle = {
    'backgroundColor': "#235DA5",
    'headerColor': "#FFFFFF",
    'pretitleColor': "#FFFFFF"
}

const viewName = (view) => {
    switch(view) {
        case "estimates": 
            return "Estimates";
        case "orders": 
            return "Work Orders";
        case "invoices":
            return "Invoices";
    }
}

// statuses displayed is based on current view
const statusesForView = (view) => {
    switch(view) {
        case "estimates": 
            return estimate_statuses;
        case "orders": 
            return workorder_statuses;
        case "invoices":
            return invoice_statuses;
    }
}

// swimlane displayed is based on current view
const swimlaneForView = (view) => {
    switch(view) {
        case "estimates": 
            return "estimateLane";
        case "orders": 
            return "workOrderLane";
        case "invoices":
            return "invoiceLane";
    }
}

const imageURLForTerritory = (territoryId) => {
    switch (territoryId) {
        // Atlanta
        case '3s8nr74T28SkhfrCM':
            return '/img/atlanta.png'
        // Charlotte
        case 'SveYBZCNSacmDthBR':
            return '/img/charlotte.png'
        // Washington, DC
        case 'j7rDtmhgdvNBhjAZG':
            return '/img/washington.png'
        default:
            return '/img/charleston.png'
    }
}

const initialsFromName = function(n){
    for(n=n.split(" "),t="",r=0;r in n;)t+=n[r][0]+'',r++;return t.toUpperCase()
};

const moveStatuses = (estimateId) => {
    const estimate = Estimates.findOne(estimateId);

    if (estimate && estimate.status) {
        return moveStatusesForEstimateStatus(estimate.status);
    }
}

const isViewingDashboard = () => {
    var currentContext = FlowRouter.current();
    const path = currentContext.path;

    return (path && path.includes("dashboard"));
}

function clearDashboardImage() {
    $('body').css('background-image', '');
}

function clearDashboardStyles() {
    $('body').css('background-color', '');
    $('.header-title').css('color', '');
    $('.header-pretitle').css('color', '');
}

function setDashboardStyle(viewStyle) {
    $('body').css('background-color', viewStyle.backgroundColor);
    $('.header-title').css('color', viewStyle.headerColor);
    $('.header-pretitle').css('color', viewStyle.pretitleColor);
}

function setDashboardImageForTerritory(territoryId) {
    const imageUrl = imageURLForTerritory(territoryId);

    // set body background image for territory
    $('body').css('background-image', 'url("' + imageUrl + '")');
}

function triggerToggleForView(view) {
    switch(view) {
        case 'estimates':
            $('#estimates').trigger('click');
            break;
        case 'orders':
            $('#orders').trigger('click');
            break;
        case 'invoices':
            $('#invoices').trigger('click');
            break;
    }
}

Template.kanbanBoard.onCreated(function () {

    this.userFilter = new ReactiveVar( "" );
    this.selectedEstimate = new ReactiveVar( null );
    this.viewLayout = new ReactiveVar( "columns" );
   
    // add tooltip popup to avatar
    Meteor.setTimeout(() => {
        $('.view-selector').tooltip({ trigger: "hover" });
    }, 2000);

    this.autorun(function() {
        const viewLayout = Template.instance().viewLayout.get();

        if ( isViewingDashboard() ) {
            // list view
            if (viewLayout == "list") {
                clearDashboardImage();
                setDashboardStyle(listViewStyle);
            }
            // column (trello) view
            else {
                const territoryId = FlowRouter.getParam('territoryId');
                setDashboardImageForTerritory(territoryId);

                setDashboardStyle(columnViewStyle);
                
            }
        }
    })
});

Template.kanbanBoard.onDestroyed(function () {
    // clear background image and any added styling when leaving dashboard
    clearDashboardImage();
    clearDashboardStyles();
})


Template.kanbanBoard.onRendered(function () {

    var filter = Session.get("dashboardSearchFilter");

    if (filter && filter.searchIndex) {
        $('#search').val(filter.searchIndex.$regex);
    }

    // scroll dashboard slightly left to center swimlanes
    $('.kanban-container').scrollLeft(10);

    this.autorun(function() {
        const currentView = FlowRouter.getParam('view');

        triggerToggleForView(currentView);
    })

});

Template.kanbanBoard.helpers({

    territoryName() {
        const territoryId = FlowRouter.getParam('territoryId');

        if (territoryId) {
            const territory = Territories.findOne(territoryId);
            return (territory && territory.title) ? territory.title : "All Territories";
        }

        return "All Territories";
    },

    territories() {
        return Territories.find();
    },

    placeholder() {
        const territoryId = FlowRouter.getParam("territoryId");
        const territory = Territories.findOne(territoryId);

        if (territory && territory.title) {
            return "Search by address in " + territory.title;
        }

        return "Search by address in All Territories";
    },

    getSelected(_id) {
        return _id == FlowRouter.getParam("territoryId") ? "selected" : "";
    },

    viewName() {
        return viewName( FlowRouter.getParam('view') );
    },

    swimlaneName() {
        return swimlaneForView( FlowRouter.getParam('view') );
    },

    jobStatuses() {
        return statusesForView( FlowRouter.getParam('view') );
    },

    userInitials(user) {
        if (user && user.profile) {
            return initialsFromName(user.profile.name);
        }
    },
    users() {
        const userFilter = Template.instance().userFilter.get();
        return Meteor.users.find({$and: [ {"profile.name": { $regex: userFilter, $options:"i" } }, {"profile.approved": true} ]});
    },

    isViewSelected(view) {
        const currentView = FlowRouter.getParam('view');
        return view == currentView;
    },

    swimlaneArgs(status) {
        return {
            status
        };
    }, 

    listArgs(status) {
        return {
            status
        };
    }, 

    moveStatuses() {
        const estimateId = Session.get('selectedEstimate');

        return moveStatuses(estimateId);
    },

    propertyInfo() {
        const estimateId = Session.get('selectedEstimate');

        return Estimates.findOne(estimateId);
    }, 

    releasers() {
        return Meteor.users.find({"profile.approved": true});
    }

})

Template.kanbanBoard.events({

    "shown.bs.tab #viewSelector": function(e, template) {
        // update board view depending on which button is selected
        const view = e.target.id;

        // set url path based upon selected dashboard view (estimates, workorders, invoices)
        FlowRouter.setParams({ "view" : view });

        if (view != 'invoices') {
            template.viewLayout.set("columns");
        }
    },

    "shown.bs.tab #viewLayoutSelector": function(e, template) {
        // update board view depending on which button is selected
        const view = e.target.id;

        template.viewLayout.set(view);
    },

    'keyup #userSearch': (event, template) => {
        event.preventDefault();

        var val = template.find("input[id=userSearch]").value;

        // update user filter based on search input
        template.userFilter.set(val);
    },

    'click #assign-to-user': function(e, template) {
        event.preventDefault();

        const userId = e.currentTarget.dataset.id;
        const estimateId = Session.get('selectedEstimate');

        // clear user search
        $("#userSearch").val("");

        if (userId && estimateId) {
            Meteor.call("assignEstimate", estimateId, userId, function(e,r) {
            });

        }

    },

    'click #hold-estimate-button': function(e, template) {
        event.preventDefault();

        const userId = Meteor.userId();
        const estimateId = Session.get('selectedEstimate');

        const holdNotes = $("#holdNotes").val();

        if (userId && estimateId) {

            Meteor.call("holdEstimate", estimateId, userId, holdNotes, function(e,r) {
                // clear notes in modal
                $("#holdNotes").val("");
            });

        }

    },

    'click #hold-workorder-button': function(e, template) {
        event.preventDefault();

        const userId = Meteor.userId();
        const workOrder = Session.get('selectedWorkOrder');

        const holdNotes = $("#workorder-holdNotes").val();

        if (userId 
            && workOrder.estimateId 
            && workOrder.orderId) {

            Meteor.call("holdWorkOrder", workOrder.estimateId, workOrder.orderId, userId, holdNotes, function(e,r) {
                // clear notes in modal
                $("#workorder-holdNotes").val("");
            });

        }

    },

    'keyup #search': (event, template) => {
        event.preventDefault();

        var val = template.find("input[id=search]").value;
        var filter = Session.get("dashboardSearchFilter") || {};

        filter.searchIndex = { $regex: val, $options:"i" };

        Session.set("dashboardSearchFilter", filter);
    },

    'change .select-css': function(event, template) {
        event.preventDefault();

        // clear saved search filter on territory change
        Session.set("dashboardSearchFilter", null); 
        $('#search').val("");

        const view = FlowRouter.getParam('view');

        const selectedTerritory = event.currentTarget.value;

        if (selectedTerritory == "All") {
            FlowRouter.go("/admin/dashboard/" + view);
        } else {
            FlowRouter.go("/admin/dashboard/" + view + "/territory/" + event.currentTarget.value)
        }

    },

    'change #moveToStatus': function(event, template) {
        event.preventDefault();

        const estimateId = Session.get('selectedEstimate');

        // new status
        const moveToStatus = event.currentTarget.value;

        if (estimateId && moveToStatus) {

            Meteor.call("updateEstimateStatus", estimateId, moveToStatus, function(e,r) {
                $('#modalMoveToStatus').modal('hide');
            });
        }
    },

    'click .submit-for-release': function(event, template) {
        event.preventDefault();

        const estimateId = Session.get('selectedEstimate');

        var assignedToId = $("#releaserAssignedTo").val(), message = $("#releaseInfo").val();

        if (assignedToId) {
            Meteor.call("submitForRelease", estimateId, assignedToId, message, function(e, r) {
                console.log(e, r);
                if (e) {
                } else {
                    $("#releaserAssignedTo").val("");
                    $("#releaseInfo").val("");
                    $("#modalReadyToRelease").modal("hide");
                }
            });
        }

    },

    'click .submit-approval': function(event, template) {
        event.preventDefault();

        const estimateId = Session.get('selectedEstimate');

        var assignedToId = $("#completeAssignedTo").val(), message = $("#additionalInfo").val();

        if (assignedToId) {
            Meteor.call("submitApproval", estimateId, assignedToId, message, function(e, r) {
                console.log(e, r);
                if (e) {
                } else {
                    $("#completeAssignedTo").val("");
                    $("#additionalInfo").val("");
                    $("#modalReadyToReview").modal("hide");
                }
            });
        }

    },

});