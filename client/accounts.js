Template.logged_out.events({
    "click #login": function(e, tmpl) {
        Meteor.loginWithGoogle({
            requestPermissions: ['email', 'profile']
        }, function(err) {
            if (err) {
                //error handling
                alert('error : ' + err);
                throw new Meteor.Error(Accounts.LoginCancelledError.numericError, 'Error');
            } else {
                //show an alert
                // alert('logged in');
            }
        });
    }
});

Template.logged_in.events({
    "click #logout": function(e, tmpl) {
        Meteor.logout(function(err) {
            if (err) {
                //sow err message
            } else {
                //show alert that says logged out
                //alert('logged out');
            }
        });
    }
})
Template.logged_in.rendered = function() {
    // Initialize collapse button
    $(".button-collapse").sideNav();
    // Initialize collapsible
    $('.collapsible').collapsible();
    $('.dropdown-button').dropdown();
};
