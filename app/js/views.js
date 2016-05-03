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

"use strict";
( function( Backbone, _, Archibald ) {

// This defines the views used throughout the application. Almost all parts are
// split into independent views, allowing for maximum flexibility and
// re-usability. It extends the global `ArchibaldCurriculum` namespace, aliased
// to `Archibald` for readability.

// A note on Backbone
// ------------------
//
// As all the views are extending *Backbone*, it is useful to see the
// official documentation on [Backbone.View](http://backbonejs.org/#View).

// Templates
// ---------
//
// This defines the default templates used by the views in the application. They
// can be overridden in various cases, as needed. Archibald Curriculum strictly
// adheres to *BEM* notation for the markup, and overrides should follow suit.
Archibald.templates = _.extend({

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
<h3 class="archibald-curriculum-ui-item-info__label">\
  <%= typeof itemInfoLabel !== "undefined" ? itemInfoLabel : "Item info" %>\
</h3>\
<div class="archibald-curriculum-ui-item-info__content nano">\
  <div class="nano-content">\
    <% if ( typeof name === "undefined" ) { %>\
      <span class="archibald-curriculum-ui-item-info-view__empty">Select an item to see its information</span>\
    <% } else { %>\
      <%= name %>\
    <% } %>\
  </div>\
</div>\
',

  // Summary tree.
  //
  // This template is meant to be used recursively. It is used to construct a
  // summary of the current application state. It is mainly used by
  // `SummaryTreeView`.
  // @todo Remove hasCycle information.
  summaryList: '\
<li\
  data-model-id="<%= id %>"\
  class="archibald-curriculum-ui-summary__list__item\
    <% if ( typeof hasCycle1 !== "undefined" && hasCycle1 ) {%>has-cycle-1<% } %>\
    <% if ( typeof hasCycle2 !== "undefined" && hasCycle2 ) {%>has-cycle-2<% } %>\
    <% if ( typeof hasCycle3 !== "undefined" && hasCycle3 ) {%>has-cycle-3<% } %>\
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

}, Archibald.templates || {});


// Item view
// ---------
//
// This view represents a single item in a column. It requires a model
// representing the item, usually a `ArchibaldCurriculum.ItemModel`. See
// `models.js` for more information.
Archibald.ItemView = Backbone.View.extend({
  // The item is rendered as a list item.
  tagName:   'li',
  className: 'archibald-column__wrapper__list__item',

  // It uses the `item` template from our templates list.
  tpl: _.template( Archibald.templates.item ),

  // This hash keeps track of the view settings.
  settings: null,

  // The item view can react to multiple events, most notably, for *editable*
  // items, the (un)checking of the checkbox, resulting in a change of state
  // of the linked model.
  //
  // Other events include the selecting of the item as a whole, or the
  // double-click, which is a shortcut of (un)checking the checkbox for
  // *editable* items.
  events: {
    "change input": "updateModel",
    "click":        "triggerSelect",
    "dblclick":     "doubleClick",
    "click input":  "preventBubble"
  },

  // Upon initialization, the view checks if a usable model is provided. If not,
  // it will throw an exception.
  initialize: function( settings ) {
    if ( !this.model ) {
      throw "Cannot initialize an ItemView without a model.";
    }
    var errors = this.model.validate();
    if ( errors && errors.length ) {
      throw "Cannot initialize an ItemView with an invalid model. Errors: " + errors.join( ', ' );
    }

    // Store the passed settings, providing defaults.
    this.settings = _.extend({
      // Whether the item is editable or not. Defaults to `false`.
      editable: false
    }, settings || {});

    // The view will react on model state changes, either re-rendering itself
    // or removing itself completely from the DOM. When such events are
    // triggered by the model, the view itself will trigger a corresponding
    // `model:*` event, which will allow events to bubble up the application
    // hierarchy.
    var that = this;
    this.model
      .bind( 'change', function() {
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
      .toggleClass( this.className + '--highlighted', !!this.model.get( 'highlighted' ) ) ;

    // We check all the data elements we have. If some of the root data elements
    // are boolean values, we treat them as modifier flags for convenience.
    if ( typeof this.model.get( 'data' ) !== 'undefined' ) {
      var data = this.model.get( 'data' );
      for ( var key in data ) {
        if ( typeof data[ key ] === 'boolean' ) {
          this.$el.toggleClass( this.className + '--' + this.cleanupClassName( key ), !!data[ key ] );
        }
      }
    }

    // Finally, add a modifier class based on the element's type.
    if ( typeof this.model.get( 'type' ) !== 'undefined' ) {
      this.$el.addClass( this.className + '--' + this.cleanupClassName( this.model.get( 'type' ) ) );
    }

    // Set an attribute based on the model's ID.
    this.$el.attr( 'data-model-id', this.model.get( 'id' ) );

    // Prepare the template variables based on the model's values. We also pass
    // some of our view's attributes.
    var variables = this.model.toJSON();
    variables.editable = this.settings.editable;

    // Preprocess the name, as it can contain newlines, which have to be
    // translated to <br> tags.
    if ( typeof variables.name !== 'undefined' ) {
      for ( var i in variables.name ) {
        variables.name[ i ] = variables.name[ i ].trim().replace( /(?:\r\n|\r|\n)/g, '<br />' );
      }
    }

    // Render the template.
    this.$el.html( this.tpl( variables ) );

    // Trigger a `render` event, so other parts of the application can interact
    // with it.
    this.trigger( 'render', this.model, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Event handler for when the checkbox is clicked. Based on the new checkbox
  // state, the model's `active` attribute will be set to `true` (checked) or
  // `false` (unchecked). The view will also trigger 2 more events:
  // * a `model:change` event, which applies to the model.
  // * either a `active` or `unactive` event, which applies to the view itself.
  updateModel: function() {
    this.model.set( 'active', this.$el.find( 'input' ).is( ':checked' ) );
    this.trigger( 'model:change', this.model, this );
    this.triggerActiveChange();
  },

  // Event handler for when the view is clicked. This triggers a `select` event.
  triggerSelect: function() {
    // Double clicking an element will also trigger the click event twice. This
    // can lead to confusing behavior. It is not possible to cleanly distinguish
    // between the 2 events, but we can trick it (kind of...). We add a timeout
    // for a single click. If a second click occurs before the timeout ends, we
    // clear the timeout and set it again. If the double-click event is
    // triggered, we clear the timeout as well (see `ItemView#doubleClick()`).
    var that = this;
    if ( typeof this.clickTimeout !== 'undefined' ) {
      clearTimeout( this.clickTimeout );
    }
    this.clickTimeout = setTimeout( function() {
      that.trigger( 'select', that.model, that );
    }, 200 );
  },

  // Event handler for when the view is double-clicked. This is a shortcut for
  // toggling the state of the checkbox, and will trigger the same 2 events as
  // `ItemView#updateModel()`:
  // * a `model:change` event, which applies to the model.
  // * either a `active` or `unactive` event, which applies to the view itself.
  doubleClick: function( e ) {
    // We stop the propagation immediately, in order to prevent triggering our
    // handler more than once.
    e.stopPropagation();

    // If necessary, prevent the triggering of the "single" click event.
    if ( typeof this.clickTimeout !== 'undefined' ) {
      clearTimeout( this.clickTimeout );
    }

    this.model.set( 'active', !this.$el.find( 'input' ).is( ':checked' ) );
    this.trigger( 'model:change', this.model, this );
    this.triggerActiveChange();
  },

  // Event handler for when the checkbox is clicked. Because clicking on the
  // checkbox will trigger both the `change` event and a `click` event, it
  // would bubble up and trigger the `select` event as well. However, this is
  // undesirable, and could leed to confusion. This is why we stop the bubbling
  // of this particular click.
  preventBubble: function( e ) {
    e.stopPropagation();
  },

  // Helper function to trigger an *active* state chance event. Will trigger
  // either an `active` or an `unactive` event, based on the state of the model.
  triggerActiveChange: function() {
    var state = this.model.get( 'active' );
    this.trigger( state ? 'active' : 'unactive', state, this.model, this );
  },

  // Cleanup string that's to be used as a class name.
  cleanupClassName: function( string ) {
    return string.replace( /([^a-z0-9_\-]+)/gi, '' );
  }
});


// Item list view
// --------------
//
// This view represents a list of items. It requires a collection containing
// all items in this list, usually a `ArchibaldCurriculum.ItemCollection`. See
// `models.js` for more information.
Archibald.ItemListView = Backbone.View.extend({
  className: 'archibald-column',

  // It uses the `itemList` template from our templates list.
  tpl: _.template( Archibald.templates.itemList ),

  // This array keeps track of all child views.
  childViews: [],

  // This hash keeps track of the view settings.
  settings: null,

  // The item view can react to 2 events, which are related to navigating the
  // application. Each list contains 2 buttons, a *Back* button, and a *Top*
  // button. Both trigger a specific event.
  events: {
    "click .archibald-column__button--show-parent": "triggerGoBack",
    "click .archibald-column__button--show-root":   "triggerGoToBeginning"
  },

  // Upon initialization, the view checks if a usable collection is provided.
  // If not, it will throw an exception.
  initialize: function( settings ) {
    if ( !this.collection ) {
      throw "Cannot initialize an ItemListView without a collection.";
    }

    // Store the passed settings, providing defaults.
    this.settings = _.extend({
      // Whether the child items are editable or not. Defaults to `false`.
      editable:  false,
      // What View to use for the child view. Defaults to `Archibald.ItemView`.
      childView: Archibald.ItemView
    }, settings || {});

    // The view will react on collection state changes, re-rendering itself
    // every time. When such events are triggered by the collection, the view
    // itself will trigger a corresponding `collection:*` event, which will
    // allow events to bubble up the application hierarchy.
    var that = this;
    this.collection
      .bind( 'add', function( model ) {
        that.trigger( 'collection:add', model, that.collection, that );
        that.render();
      })
      .bind( 'remove', function( model ) {
        that.trigger( 'collection:remove', model, that.collection, that );
        that.render();
      });
  },

  // Render the item list.
  render: function() {
    // Completely empty the wrapper; start with a blank slate.
    if ( this.childViews.length ) {
      for ( var i = this.childViews.length - 1; i > 0; --i ) {
        this.childViews[ i ].remove();
      }
    }
    this.childViews = [];
    this.$el.empty();
    this.$el.html( this.tpl() );

    var $ul = this.$el.find( 'ul' ),
        that = this;

    // Go through the collection, and create a new child view for each model.
    this.collection.forEach( function( model ) {
      // Prepare the child view, and register it with our view.
      var item = new that.settings.childView({ model: model, editable: that.settings.editable });
      that.childViews.push( item );

      // Listen on certain events the child view can trigger. This will allow
      // us to let them bubble up the hierarchy.
      item
        .on( 'model:change', function() {
          that.triggerItemEvent( 'change', model );
        })
        .on( 'select', function() {
          that.triggerItemEvent( 'select', model );
        })
        .on( 'render', function() {
          that.triggerItemEvent( 'render', model, item );
        });

      // Render the item and add it to our markup.
      $ul.append( item.render().$el );
    });

    // Trigger a `render` event, so other parts of the application can interact
    // with it.
    this.trigger( 'render', this.collection, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Helper function to collapse the list.
  collapse: function() {
    this.$el.addClass( 'archibald-column--collapsed' );

    // Trigger a `column:collapse` event.
    this.trigger( 'column:collapse', this.collection, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Helper function to expand the list.
  expand: function() {
    this.$el.removeClass( 'archibald-column--collapsed' );

    // Trigger a `column:expand` event.
    this.trigger( 'column:expand', this.collection, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Helper function to check whether the list is collapsed.
  isCollapsed: function() {
    return this.$el.hasClass( 'archibald-column--collapsed' );
  },

  // Helper function to check whether the list is expanded.
  isExpanded: function() {
    return !this.isCollapsed();
  },

  // Helper function to trigger an `item:*` event.
  triggerItemEvent: function( event, itemModel, itemView ) {
    if ( typeof itemView !== 'undefined' ) {
      this.trigger( 'item:' + event, itemModel, itemView, this.collection, this );
    } else {
      this.trigger( 'item:' + event, itemModel, this.collection, this );
    }
  },

  // Event handler for when the *Back* button is clicked. Triggers a
  // `column:go-back` event.
  triggerGoBack: function() {
    this.trigger( 'column:go-back', this.collection, this );
  },

  // Event handler for when the *Top* button is clicked. Triggers a
  // `column:go-to-root` event.
  triggerGoToBeginning: function() {
    this.trigger( 'column:go-to-root', this.collection, this );
  }
});


// Item info view
// --------------
//
// This view represents information about an item.  It requires a model
// representing the item, usually a `ArchibaldCurriculum.ItemModel`. See
// `models.js` for more information.
Archibald.ItemInfoView = Backbone.View.extend({
  className: 'archibald-curriculum-ui-item-info',

  // It uses the `itemList` template from our templates list.
  tpl: _.template( Archibald.templates.itemInfo ),

  // The item info view can be collapsed by clicking on its label.
  events: {
    "click .archibald-curriculum-ui-item-info__label": "toggleCollapse"
  },

  // Upon initialization, the view checks if a usable model is provided. If not,
  // it will throw an exception.
  initialize: function() {
    if ( this.model ) {
      var errors = this.model.validate();
      if ( errors && errors.length ) {
        throw "Cannot initialize an ItemInfoView with an invalid model. Errors: " + errors.join( ', ' );
      }
    }
  },

  // Render the item information.
  render: function() {
    // Start with a blank slate.
    this.$el.empty();

    // Prepare the template variables and render the template.
    var variables = this.model ? this.model.toJSON() : {};
    this.$el.html( this.tpl( variables ) );

    // Trigger a `render` event, so other parts of the application can interact
    // with it.
   this.trigger( 'render', this.model, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Collapse or expand the item information element, based on its previous
  // state. This will trigger a expand or collapse event, so other parts of the
  // application can react to this action.
  toggleCollapse: function() {
    this.$el.toggleClass( 'archibald-curriculum-ui-item-info--expanded' );
    this.trigger(
      this.$el.hasClass( 'archibald-curriculum-ui-item-info--expanded' ) ? 'expand' : 'collapse',
      this.model,
      this
    );
  }
});


// Summary tree view
// -----------------
//
// This view represents information about the state of the application. When
// items are selected, their `active` attribute is set to `true`. Based on this
// information, we can construct a summary of all active items. As the data is
// a hierarchy, we display it as a recursively rendered tree.
Archibald.SummaryTreeView = Backbone.View.extend({
  className: 'archibald-curriculum-ui-summary',

  // It uses the `summaryList` template from our templates list.
  tpl: _.template( Archibald.templates.summaryList ),

  // The summary view can react to multiple events, most importantly the `click`
  // event. This will trigger a `summary:select-item` event, which will allow
  // other parts of the application to react accordingly. Other events are
  // `mouseover` and `mouseout`  events. These trigger the toggling of CSS
  // classes, which can be used to highlight structural information.
  events: {
    "mouseover li > span": "mouseOver",
    "mouseout li > span":  "mouseOut",
    "click li":            "triggerSelect"
  },

  // Upon initialization, the view checks if a usable collection is provided.
  // If not, it will throw an exception.
  initialize: function() {
    if ( !this.collection ) {
      throw "Cannot initialize an SummaryTreeView without a collection.";
    }

    // The view will react on collection state changes, re-rendering itself
    // every time.
    var that = this;
    this.collection
      .bind( 'change remove add', function() {
        that.render();
      });
  },

  // Render the summary tree.
  render: function() {
    // The `SummaryTreeView#render()` method can be called very often, sometimes
    // several times per ms. We don't want that. So, we put  a little timeout
    // and wait. If the render function hasn't been called again for a certain
    // time, we proceed with the rendering. Otherwise, we cancel the render, and
    // wait again.
    var that = this;
    if ( typeof this.timeout !== 'undefined' ) {
      this.timeout = clearTimeout( this.timeout );
    }
    this.timeout = setTimeout( function() {
      that.realRender();
      that.timeout = clearTimeout( that.timeout );
    }, 10 );

    // Allow the chaining of method calls.
    return this;
  },


  // Actual render callback.
  realRender: function() {
    this.$el.empty();
    this.$el.append( this.recursiveRender( 'root' ) );

    // Trigger a `render` event, so other parts of the application can interact
    // with it.
    this.trigger( 'render', this.collection, this );

    // Allow the chaining of method calls.
    return this;
  },

  // Helper function to recursively render the summary tree, starting at the
  // passed parent ID.
  recursiveRender: function( parentId ) {
    var that = this,
        children = this.collection.where({ parentId: parentId, active: true }),
        html = '';

    if ( children.length ) {
      // Render a list of child items.
      html = '<ul class="archibald-curriculum-ui-summary__list">';
      children.forEach( function( model ) {
        // Render a single item. Recursively get the child markup by calling
        // `SummaryTreeView#recursiveRender()` again.
        var variables = model.toJSON();
        variables.children = that.recursiveRender( model.get( 'id' ) );

        // Cleanup the name. Some elements contain HTML, and our summary tree is
        // quite fragile.
        var tmp;
        for ( var i in variables.name ) {
          // Trick to strip an element of all markup.
          // See http://stackoverflow.com/questions/5002111/javascript-how-to-strip-html-tags-from-string
          tmp = document.createElement( 'div' );
          tmp.innerHTML = variables.name[ i ];
          variables.name[ i ] = tmp.textContent || tmp.innerText || variables.name[ i ];
        }

        html += that.tpl( variables );
      });
      html += '</ul>';
    }

    return html;
  },

  // Event handler for `mouseover` events. Stop the bubbling up of the event,
  // so we can distinguish which exact (sub)tree got hovered.
  mouseOver: function( e ) {
    e.stopPropagation();
    this.$( e.target )
      .parent().addClass( 'hover' )
        .parents( 'li' ).addClass( 'child-hovered' );
  },

  // Event handler for `mouseout` events. Undo the modifications done by the
  // `mouseover` event.
  mouseOut: function( e ) {
    this.$( e.target )
      .parent().removeClass( 'hover' )
        .parents( 'li' ).removeClass( 'child-hovered' );
  },

  // Event handler for clicking on an item in the tree. Stop the bubbling up
  // of the event, and trigger a `summary:select-item` event, so other parts
  // of the application can react to it.
  triggerSelect: function( e ) {
    e.stopPropagation();
    var itemModel = this.collection.get(
      this.$( e.currentTarget ).attr( 'data-model-id' )
    );
    this.trigger( 'summary:select-item', itemModel, this.collection, this );
  }
});

})( Backbone, _, window.ArchibaldCurriculum || ( window.ArchibaldCurriculum = new Object() ) );
