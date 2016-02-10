/**
 * @file
 * Archibald Curriculum JS application views.
 *
 * This defines the views used throughout the application. Note that this file
 * is written using Docco syntax. If Node is installed, you can generate this
 * documentation by running:
 *
 *   npm install
 *   npm run doc
 *
 * This will generate the documentation in the docs/ folder, in HTML format.
 */

(function( Backbone, _, Archibald ) {

// This defines the views used throughout the application. Almost all parts are
// split into independent views, allowing for maximum flexibility and
// re-usability. It extends the global `ArchibaldCurriculum` namespace, aliased
// to `Archibald` for readability.

// A note on Backbone
// ------------------
//
// As much of the application is extending *Backbone*, it is useful to see the
// official documentation on [Backbone.View](http://backbonejs.org/#View).

// Templates
// ---------
//
// This defines the default templates used by the application. They can be
// overridden in various cases, as needed. Archibald Curriculum strictly adheres
// to *BEM* notation for the markup, and overrides should follow suit.
Archibald.templates = {

  // A single item.
  //
  // This template is mainly used by `ItemView`, and represents a single item
  // in a list.
  item: '\
<% if ( editable ) { %>\
  <input type="checkbox"<% if ( active ) { %> checked<% } %>/>\
<% } %>\
<% for ( var i in name ) { %>\
  <%= name[ i ] %>\
  <% if ( i < name.length - 1 ) {%><hr /><% } %>\
<% } %>\
<% if ( hasChildren ) { %>\
  <i class="icon-chevron-right" />\
<% } %>\
',

  // A list of items.
  //
  // This template is mainly used by `ItemListView`, and represents a list of
  // items, usually ItemViews. Note that it uses classes for the *nanoScroller*
  // jQuery plugin for convenience.
  itemList: '\
<div class="archibald-column__wrapper nano">\
  <ul class="archibald-column__wrapper__list nano-content"></ul>\
</div>\
<span class="archibald-column__button archibald-column__button--show-parent">\
  <i class="icon-chevron-left" /> Back\
</span>\
<span class="archibald-column__button archibald-column__button--show-root">\
  <i class="icon-chevron-left" /><i class="icon-chevron-left" /> Top\
</span>\
',

  // Information about a specific item.
  //
  // Used to display more detailed information about an item. This is most
  // certainly the best candidate for an override, as it greatly depends on
  // context. It provides a sensible default template, with very little
  // information other than a link. Mainly used by `ItemInfoView`.
  itemInfo: '\
<div class="archibald-item-info">\
  <span class="archibald-item-info__label"><%= label %>:</span>\
  <% if ( url ) { %>\
    <a class="archibald-item-info__url" target="_blank" href="<%= url %>">\
  <% } %>\
  <span class="archibald-item-info__value"><%= type %></span>\
  <% if ( url ) { %>\
    </a>\
  <% } %>\
</div>\
',

  // Summary tree.
  //
  // This template is meant to be used recursively. It is used to construct a
  // summary of the current application state. It is mainly used by
  // `SummaryTreeView`.
  summaryList: '\
<li\
  data-model-id="<%= id %>"\
  class="archibald-summary-tree__list__item\
    <% if ( hasCycle1 ) {%>has-cycle-1<% } %>\
    <% if ( hasCycle2 ) {%>has-cycle-2<% } %>\
    <% if ( hasCycle3 ) {%>has-cycle-3<% } %>\
  "\
>\
  <span>\
    <% for ( var i in name ) { %>\
      <%= name[ i ] %>\
      <% if ( i < name.length - 1 ) {%><hr /><% } %>\
    <% } %>\
  </span>\
  <%= children %>\
</li>\
'

};


// Item view
// ---------
//
// This view represents a single item in a column. It requires a model
// representing the item, usually a `ArchibaldCurriculum.ItemModel`. See
// `models.js` for more information.
Archibald.ItemView = Backbone.View.extend({
  // The item is rendered as a list item.
  tagName: 'li',
  className: 'archibald-column__wrapper__list__item',

  // It uses the `item` template from our templates list.
  tpl: _.template(Archibald.templates.item),

  // The item view can react to multiple events, most notably, for *editable*
  // items, the (un)checking of the checkbox, resulting in a change of state
  // of the linked model.
  //
  // Other events include the selecting of the item as a whole, or the
  // double-click, which is a shortcut of (un)checking the checkbox for
  // *editable* items.
  events: {
    "change input": "updateModel",
    "click": "triggerSelect",
    "dblclick": "doubleClick",
    "click input": "preventBubble"
  },

  // Upon initialization, the view checks if a usable model is provided. If not,
  // it will throw an exception.
  initialize: function( args ) {
    var errors;
    if ( !this.model ) {
      throw "Cannot initialize an ItemView without a model.";
    }
    else if ( errors = this.model.validate() ) {
      throw "Cannot initialize an ItemView with an invalid model. Errors: " + errors.join( ', ' );
    }

    // Whether the item is editable or not. Defaults to `false`.
    this.editable = typeof args !== 'undefined' ? !!args.editable : false;

    // The view will react on model state changes, either re-rendering itself
    // or removing itself completely from the DOM. When such events are
    // triggered by the model, the view itself will trigger a corresponding
    // `model:*` event, which will allow events to bubble up the application
    // hierarchy.
    var that = this;
    this.model
      .bind( 'change', function() {
        that.trigger( 'model:change', that.model, that );
        that.render();
      })
      .bind( 'destroy', function() {
        that.trigger( 'model:destroy', that.model, that );
        that.remove();
      });
  },

  // Render the item.
  render: function() {
    this.$el.empty();

    // We set many modifier classes based on the model's values. However, we set
    // these on our $el element itself, not its child elements. This means we
    // have to set these classes here instead of through the template.
    this.$el
      .toggleClass( this.className + '--active', !!this.model.get( 'active' ) )
      .toggleClass( this.className + '--has-children', !!this.model.get( 'hasChildren' ) )
      .toggleClass( this.className + '--expanded', !!this.model.get( 'expanded' ) )
      .toggleClass( this.className + '--highlighted', !!this.model.get( 'highlighted' )) ;

    // Same thing for the ID, which is based on the model's ID.
    this.$el.attr('id', this.className + '-' + this.model.get('id'));

    // Prepare the template variables based on the model's values. We also pass
    // some of our view's attributes.
    var variables = this.model.toJSON();
    variables.editable = this.editable;

    // Render the template.
    this.$el.html( this.tpl( variables ) );

    // Trigger a `render` event, so other parts of the application can interact
    // with it.
    this.trigger('render', this.model, this);

    // Allow the chaining of method calls.
    return this;
  },
  updateModel: function(e) {
    this.model.set('active', this.$(e.target).is(':checked'));
    this.trigger('model:change', this.model, this, e);
    this.triggerActiveChange();
  },
  triggerSelect: function(e) {
    this.trigger('select', this.model, this, e);
  },
  doubleClick: function(e) {
    e.stopPropagation();
    this.model.set('active', !this.$el.find('input').is(':checked'));
    this.trigger('model:change', this.model, this, e);
    this.triggerActiveChange();
  },
  preventBubble: function(e) {
    e.stopPropagation();
  },
  triggerActiveChange: function() {
    var state = this.model.get('active');
    this.trigger(state ? 'active' : 'unactive', state, this.model, this);
  }
});

/**
 * Item list view.
 *
 * A column of items.
 */
Archibald.ItemListView = Backbone.View.extend({
  className: 'archibald-column',
  tpl: _.template(Archibald.templates.itemList),
  events: {
    "click .archibald-column__button--show-parent": "triggerGoBack",
    "click .archibald-column__button--show-root": "triggerGoToBeginning"
  },
  initialize: function(args) {
    if (!this.collection) {
      throw "Cannot initialize an ItemListView without a collection.";
    }

    this.editable = !!args.editable;

    var that = this;
    this.collection
      .bind('add', function(model) {
        that.trigger('collection:add', model, that.collection, that);
        that.render();
      })
      .bind('remove', function(model) {
        that.trigger('collection:remove', model, that.collection, that);
        that.render();
      });
  },
  render: function() {
    this.$el.empty();
    this.$el.html(this.tpl());

    var $ul = this.$el.find('ul'),
        that = this;
    this.collection.forEach(function(model) {
      var item = new Archibald.ItemView({ model: model, editable: that.editable });
      item
        .on('model:change', function(e) {
          that.triggerItemEvent('change', model, e);
        })
        .on('select', function(e) {
          that.triggerItemEvent('select', model, e);
        });
      item.render();
      $ul.append(item.$el);
    });

    this.trigger('render', this.collection, this);

    return this;
  },
  collapse: function() {
    this.$el.addClass('archibald-column--collapsed');
    this.trigger('column:collapse', this.collection, this);
    return this;
  },
  expand: function() {
    this.$el.removeClass('archibald-column--collapsed');
    this.trigger('column:expand', this.collection, this);
    return this;
  },
  isCollapsed: function() {
    return this.$el.hasClass('archibald-column--collapsed');
  },
  isExpanded: function() {
    return !this.isCollapsed();
  },
  triggerItemEvent: function(event, itemModel, e) {
    this.trigger('item:' + event, itemModel, this.collection, this, e);
  },
  triggerGoBack: function(e) {
    this.trigger('column:go-back', this.collection, this, e);
  },
  triggerGoToBeginning: function(e) {
    this.trigger('column:go-to-root', this.collection, this, e);
  }
});

/**
 * Item info view.
 *
 * This view represents a single item's information.
 *
 * @see ArchibaldCurriculum.ItemModel
 */
Archibald.ItemInfoView = Backbone.View.extend({
  className: 'archibald-item-info__wrapper',
  tpl: _.template(Archibald.templates.itemInfo),
  initialize: function(args) {
    var errors;
    if (!this.model) {
      throw "Cannot initialize an ItemInfoView without a model.";
    }
    else if (errors = this.model.validate()) {
      throw "Cannot initialize an ItemInfoView with an invalid model. Errors: " + errors.join(', ');
    }

    this.typeLabel = typeof args.typeLabel !== 'undefined' ? args.typeLabel : "Type";
    this.typeDescriptionLabel = typeof args.typeDescriptionLabel !== 'undefined' ? args.typeDescriptionLabel : "Type description";
    this.itemDescriptionLabel = typeof args.itemDescriptionLabel !== 'undefined' ? args.itemDescriptionLabel : "Description and usage";
    this.itemUrlLabel = typeof args.itemUrlLabel !== 'undefined' ? args.itemUrlLabel : "More information";

  },
  render: function() {
    this.$el.empty();

    if (this.model.has('name')) {
      // Prepare the template variables.
      var variables = this.model.toJSON();
      variables.typeLabel = this.typeLabel;
      variables.typeDescriptionLabel = this.typeDescriptionLabel;
      variables.itemDescriptionLabel = this.itemDescriptionLabel;
      variables.itemUrlLabel = this.itemUrlLabel;

      // Dummy data. This is needed until the JSON structure is completed.
      variables.typeUrl = 'http://www.google.com';
      variables.type = (['Lorem ipsum', 'Dolor sit amet', 'Consectetur elit'])[Math.floor(Math.random() * 3)];
      variables.typeDescription = ([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nisl tortor, mollis at ultrices et, cursus non libero. In lobortis pellentesque purus ac pellentesque.',
        'Lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non, sagittis.',
        'In lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non'
      ])[Math.floor(Math.random() * 3)];
      variables.itemUrl = 'http://www.goog.com';
      variables.itemDescription = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nisl tortor, mollis at ultrices et, cursus non libero. In lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non, sagittis et lacus. Suspendisse vel semper ex.';

      this.$el.html(this.tpl(variables));
    } else {
      this.$el.html('');
    }

    return this;
  }
});

/**
 * Summary tree view.
 *
 * A tree of currently active items.
 */
Archibald.SummaryTreeView = Backbone.View.extend({
  className: 'archibald-summary-tree',
  tpl: _.template(Archibald.templates.summaryList),
  events: {
    "mouseover li > span": "mouseOver",
    "mouseout li > span": "mouseOut",
    "click li": "triggerSelect"
  },
  initialize: function(args) {
    if (!this.collection) {
      throw "Cannot initialize an SummaryTreeView without a collection.";
    }

    var that = this;
    this.collection
      .bind('change remove add', function() {
        that.render();
      });
  },
  render: function() {
    var that = this;

    // Actual render call. See below for more information.
    var render = function() {
      that.$el.empty();
      that.$el.append(recursiveRender('root'));
    };

    // Recursive tree-render function.
    var recursiveRender = function(parentId) {
      var children = that.collection.where({ parentId: parentId, active: true }),
          html = '';

      if (children.length) {
        html = '<ul class="archibald-summary-tree__list">';
        children.forEach(function(model) {
          // Render a single item. Prepare its data.
          var variables = model.toJSON();
          if (typeof model.get('data').cycle.indexOf !== 'undefined') {
            for (var i in { 1:1, 2:2, 3:3 }) {
              variables['hasCycle' + i] = model.get('data').cycle.indexOf(i) !== -1;
            }
          }
          variables.children = recursiveRender(model.get('id'));

          html += that.tpl(variables);
        });
        html += '</ul>';
      }

      return html;
    };

    // The render function can be called very often, sometimes several times
    // per ms. We don't want that. So, we put a little timeout and wait. If the
    // render function hasn't been called again for a certain time, we proceed
    // with the rendering. Otherwise, we cancel the render, and wait again.
    if (typeof this.timeout !== 'undefined') {
      this.timeout = clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(function() {
      render();
      that.timeout = clearTimeout(that.timeout);
    }, 10);

    return this;
  },
  mouseOver: function(e) {
    e.stopPropagation();
    this.$(e.target).parent().addClass('hover').parents('li').addClass('child-hovered');
  },
  mouseOut: function(e) {
    this.$(e.target).parent().removeClass('hover').parents('li').removeClass('child-hovered');
  },
  triggerSelect: function(e) {
    e.stopPropagation();
    var itemModel = this.collection.get(this.$(e.currentTarget).attr('data-model-id'));
    this.trigger('summary:select-item', itemModel, this.collection, this, e);
  }
});

})(Backbone, _, window.ArchibaldCurriculum || (window.ArchibaldCurriculum = {}));
