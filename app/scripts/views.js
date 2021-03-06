define(['concept', 'backbone', 'template', 'hoist'], function(Concept, Backbone, Template, hoist) {
    'use strict';
    Concept.Navigation = Backbone.View.extend({
        events: {
            'click .ViewProjects': 'viewProjects',
            'click .AddProject': 'addProject',
            'click .Notifications': 'notifications'
        },

        el: '#Navigation',

        viewProjects: function() {
            new Concept.View.Projects();
        },

        addProject: function() {
            new Concept.View.AddProject();
        },

        notifications: function() {
            new Concept.View.Notifications();
        }
    });

    Concept.Confirm = Backbone.View.extend({
        el: '#Confirm',

        events: {
            'click a': 'callback',

            'click .content': 'swallow',
            'click': 'remove'
        },

        initialize: function() {
            Template.render(this.el, this.options);
            this.$el.show();
        },

        callback: function() {
            this.options.Callback.call();
        }
    });

    // base class for views

    Concept.View = Backbone.View.extend({
        initialize: function() {
            var view = this.$el.data('view');

            if (view && view.trash) {
                view.trash();
            }

            if (!this.$el.hasClass('modal')) {
                $('section').hide();
            }

            this.$el.data('view', this);

            var el = this.$el;

            this.$el.on('keyup', '[type=text]', function(e) {
                if (e.which === 13) {
                    el.trigger('enter');
                }
            });

            if (this.start) {
                this.start();
            }

            this._render();

            if (this.model) {
                this.listenTo(this.model, 'change', this._render);
            }

            this.$el.show();
        },

        objectify: function() {
            // simple for now

            var hash = {};

            this.$('[name]').each(function() {
                hash[$(this).attr('name')] = $(this).val();
            });

            return hash;
        },

        swallow: function(e) {
            e.stopPropagation();
        },

        validates: function() {
            var valid = true;

            this.$('[required]').each(function() {
                if (!$(this).val()) {
                    valid = false;
                }
            });

            return valid;
        },

        clear: function() {
            this.$('[name]').val('');
        },

        _render: function() {
            if (this.model) {
                Template.render(this.el, this.model);
            }
        },

        trash: function() {
            this.stopListening();
            this.undelegateEvents();
            this.off();

            this.$el.off();
            this.$el.removeData('view').hide();

            if (this.end) {
                this.end();
            }
        }
    });

    Concept.View.Dashboard = Concept.View.extend({
        events: {
            'click .ViewProjects a': 'viewProjects',
            'click .AddProject a': 'addProject'
        },

        el: '#Dashboard',

        viewProjects: function() {
            new Concept.View.Projects();
        },

        addProject: function() {
            new Concept.View.AddProject();
        }
    });

    Concept.View.Projects = Concept.View.extend({
        events: {
            'click .view': 'view'
        },

        el: '#ViewProjects',

        start: function() {
            this.model = Concept.projects;
        },

        view: function(e) {
            var model = this.model.get($(e.target).closest('.item').attr('data-id'));

            if (model) {
                new Concept.View.Project({
                    model: model
                });
            }
        }
    });

    Concept.View.Project = Concept.View.extend({
        events: {
            'click .DeleteProject': 'deleteProject',
            'click .ShareProject': 'shareProject',

            'click .add': 'add',
            'click .ViewDesign': 'viewDesign',
            'click .design': 'viewDesign'
        },

        el: '#Project',

        add: function() {
            var model = this.model;

            new Concept.View.AddDesign().on('add', function(design) {
                model.get('Designs').add(design);
            });
        },

        viewDesign: function(e) {
            var model = this.model.get('Designs').get($(e.target).closest('.item').attr('data-id'));

            if (model) {
                new Concept.View.Design({
                    model: model
                });
            }
        },

        deleteProject: function() {
            var model = this.model;

            new Concept.Confirm({
                Title: 'Delete project',
                Message: 'Are you sure you want to delete this project?',
                Action: 'Delete',
                Callback: function() {
                    Concept.projects.remove(model);
                    new Concept.View.Dashboard();
                }
            });
        },

        shareProject: function() {
            new Concept.View.InviteUser();
        }
    });

    Concept.View.AddProject = Concept.View.extend({
        events: {
            'click .add': 'add',
            'enter': 'add',

            'click .content': 'swallow',
            'click': 'trash'
        },

        el: '#AddProject',

        add: function() {
            if (!this.validates()) {
                return;
            }

            var model = new Concept.Project(this.objectify());
            model.save();
            if (Concept.projects) {
                Concept.projects.add(model);
            }
            else{
                Concept.projects=[model];
            }
            new Concept.View.Project({
                model: model
            });

            this.clear();
            this.trash();
        }
    });

    Concept.View.Design = Concept.View.extend({
        events: {
            'click .close': 'trash',
            'keydown textarea': 'keydown',
            'click .AddComment': 'addComment',

            'click .container': 'swallow',
            'click': 'trash'
        },

        el: '#Design',

        keydown: function(e) {
            if (e.which === 13) {
                this.addComment();
                e.preventDefault();
            }
        },

        addComment: function() {
            var textarea = this.$('textarea');

            this.model.get('Comments').add(new Concept.Comment({
                Author: (['Jamie', 'Andrew', 'Shalita', 'Josh', 'Helen', 'Simon'])[Math.floor(Math.random() * 6)],
                Content: textarea.val()
            }));

            textarea.val('');
        }
    });

    Concept.View.AddDesign = Concept.View.extend({
        events: {
            'click .add': 'add',
            'enter': 'add',
            'change :file': 'change',
            'click .input-cage a': 'upload',

            'click .content': 'swallow',
            'click': 'trash'
        },

        el: '#AddDesign',

        upload: function() {
            this.$(':file').click();
        },

        change: function(e) {
            var a = $(e.target).val();
            a = a.slice(a.lastIndexOf('/') + 1);
            a = a.slice(a.lastIndexOf('\\') + 1);

            $(e.target).siblings('[type=text]').val(a);
        },

        add: function() {
            if (!this.validates()) {
                return;
            }

            var hash = this.objectify();

            var file = this.$(':file')[0].files[0];

            hash.URL = URL.createObjectURL(file);

            this.trigger('add', new Concept.Design(hash));

            this.trash();
        }
    });

    Concept.View.InviteUser = Concept.View.extend({
        events: {
            'click .content': 'swallow',
            'click': 'trash'
        },

        el: '#InviteUser'
    });

    Concept.View.Notifications = Concept.View.extend({
        el: '#Notifications'
    });

    Concept.View.Login = Concept.View.extend({
        events: {
            'click .login a': 'login',
            'click .signup a': 'signup'
        },

        el: '#Login',

        login: function() {
            hoist.login(this.$('#EmailAddress').val(), this.$('#Password').val(), function() {
                new Concept.View.Dashboard();
            });
            return false;

        },
        signup: function() {
            new Concept.View.SignUp();
        }

    });
    Concept.View.SignUp = Concept.View.extend({
        events: {
            'click .signup a': 'signup'
        },

        el: '#SignUp',

        signup: function() {
            hoist.signup(this.$('#Name').val(), this.$('#EmailAddress').val(), this.$('#Password').val(), function() {
                new Concept.View.Dashboard();
            });
            return false;
        }

    });
    return Concept;

});
