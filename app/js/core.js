/**
 * @file
 * Archibald Curriculum JS application core.
 *
 * This defines the core class that initializes the application. It can be
 * considered as the "controller" for the views and models. Note that this file
 * is written using Docco syntax. If Node is installed, you can generate this
 * documentation by running:
 *
 *   npm install
 *   npm run doc
 *
 * This will generate the documentation in the docs/ folder, in HTML format.
 */

"use strict";
( function( $, Backbone, _, Archibald ) {

// Constructor.
//
// @param {Object} items
//    An object representing the JSON database of all curriculum items.
// @param {Object} wrapper
//    The jQuery object that serves as a wrapper for the application.
// @param {Object} settings
//    The settings object. @todo
var Core = function( settings, items, wrapper ) {
  // Initialize the item database. This parses the raw data items and
  // initializes them as reusable models.
  this.setItemDatabase( items );

  // Store the application DOM wrapper.
  this.setWrapper( wrapper );

  // Initialize the column database. This will hold all column views (yes,
  // views) that are currently available "on screen". This way of referencing
  // views using models and a collection allows us to perform actions based
  // on column "location" much faster than traversing the DOM. It also allows
  // us to cleanly keep track of what columns are available.
  this.columnDatabase = new Archibald.ColumnCollection();
  this.columnDatabase.on( 'remove', function( model ) {
    model.get( 'column' ).remove();
  });
};

// Extend the `ArchibaldCurriculum.Core` prototype.
Core.prototype = {

  // Prepare an item database. This will allow us to quickly update large
  // lists of items, in case of recursive checking, for example.
  itemDatabase: null,

  // Prepare a column database. This will allow us to manipulate columns,
  // like collapsing, hiding, showing, etc.
  columnDatabase: null,

  // Prepare a reference to the application wrapper.
  $el: null,

  // Prepare a reference to the application summary wrapper, if used.
  $summaryEl: null,

  // Prepare a reference to the summary view.
  summaryTreeView: null,

  // Set or refresh the application DOM wrapper.
  //
  // @param {Object} wrapper
  //    The jQuery object that serves as a wrapper for the application.
  setWrapper: function( wrapper ) {
    this.$el = wrapper || this.$el;
  },

  // Get the application DOM wrapper.
  //
  // @returns {Object}
  getWrapper: function() {
    return this.$el;
  },

  // Set or refresh the application summary DOM wrapper.
  //
  // @param {Object} wrapper
  //    The jQuery object that serves as a wrapper for the application summary.
  setSummaryWrapper: function( wrapper ) {
    // Empty the summary view.
    wrapper.empty();

    // Pass our item database to the summary view, which will pick out the
    // active elements, and render them.
    this.summaryTreeView = new Archibald.SummaryTreeView({
      collection: this.itemDatabase
    });

    // Append the summary wrapper to our application wrapper, keeping things
    // together.
    wrapper.append( this.summaryTreeView.render().$el );

    // Store a reference to the summary wrapper.
    this.$summaryEl = wrapper;
  },

  // Get the application summary DOM wrapper.
  //
  // @returns {Object}
  getSummaryWrapper: function() {
    return this.$summaryEl;
  },

  // Get the application summary view.
  //
  // @returns {Object}
  getSummary: function() {
    return this.summaryTreeView;
  },

  // Set or refresh the global item database.
  //
  // Calling this function will purge the existing item database, and replace
  // all items with the new ones.
  //
  // @param {Object} items
  //    An object representing the JSON database of all curriculum items.
  setItemDatabase: function( items ) {
    this.itemDatabase = new Archibald.ItemCollection();

    for ( var group in items ) {
      for ( var i in items[ group ] ) {
        this.itemDatabase.add( new Archibald.ItemModel({
          id:          items[ group ][ i ].id,
          name:        items[ group ][ i ].name,
          data:        items[ group ][ i ].data,
          parentId:    group,
          hasChildren: !!(
            typeof items[items[ group ][ i ].id] !== 'undefined' &&
            items[items[ group ][ i ].id].length
          )
        }) );
      }
    }
  },

  // Get the global item database.
  //
  // @returns {ArchibaldCurriculum.ItemCollection}
  getItemDatabase: function() {
    return this.itemDatabase;
  },

  // Get the global column database.
  //
  // @returns {ArchibaldCurriculum.ColumnCollection}
  getColumnDatabase: function() {
    return this.columnDatabase;
  },

  // Prepare a new column.
  //
  // @param {Array} items
  //    The items to put in the column.
  // @param {Boolean} editable
  //    (optional) Whether the column items are editable or not. Defaults to true.
  // @param {Boolean} collapsed
  //    (optional) Whether the column should be collapsed on creation or not.
  //    Defaults to false.
  //
  // @returns {ArchibaldCurriculum.ItemListView}
  createColumn: function( items, editable, collapsed ) {
    // Editable by default.
    editable = typeof editable !== 'undefined' ? editable : true;
    var column = new Archibald.ItemListView({
      collection: new Archibald.ItemCollection( items ),
      editable:   editable
    });

    // Must the column be collapsed by default?
    if ( collapsed ) {
      column.collapse();
    }

    // Add it to the wrapper.
    this.$el.append( column.render().$el );

    // Activate the nanoScroller plugin.
    // @todo Handle this in Drupal scope?
    if ( typeof $.fn.nanoScroller !== 'undefined' ) {
      column.$el.find( '.nano' ).nanoScroller();
    }

    // Add our new column to our column database.
    this.columnDatabase.add({ column: column});

    return column;
  },

  // Get the columns to the right of the passed column.
  //
  // @param {ArchibaldCurriculum.ItemListView} column
  //
  // @returns {Array}
  //    An array of ArchibaldCurriculum.ColumnModel items.
  getColumnRightSiblings: function( column ) {
    var index = this.columnDatabase.indexOf(
      this.columnDatabase.findWhere({ column: column })
    );
    if ( this.columnDatabase.length > index + 1 ) {
      return this.columnDatabase.slice( index + 1 );
    }
    else {
      return [];
    }
  },

  // Get the columns to the left of the passed column.
  //
  // @returns {Array}
  //    An array of ArchibaldCurriculum.ColumnModel items.
  getColumnLeftSiblings: function( column ) {
    var index = this.columnDatabase.indexOf(
      this.columnDatabase.findWhere({ column: column })
    );
    return this.columnDatabase.slice( 0, index );
  },

  // Helper function to recursively "check" or "uncheck" items.
  //
  // @param {ArchibaldCurriculum.ItemModel} item
  //    The item from which the recursive (un)checking must start.
  // @param {Boolean} prompt
  //    (optional) Whether to prompt the user in case of recursively unchecking
  //    items. Defaults to true.
  // @param {String} promptMessage
  //    (optional) If the user must be prompted, this message will be used.
  //    Defaults to "This will also uncheck all child items. Are you sure you
  //    want to continue?"
  recursiveCheck: function( item, prompt, promptMessage ) {
    prompt = !!prompt;
    promptMessage = promptMessage || "This will also uncheck all child items. Are you sure you want to continue?";

    // If an item is selected, we must also select all its parents.
    if ( item.get( 'active' ) ) {
      var parentId = item.get( 'parentId' ),
          parentItem;
      while ( parentId !== 'window' ) {
        parentItem = this.itemDatabase.get( parentId );
        parentItem.set( 'active', true );
        parentId = parentItem.get( 'parentId' );
      }
    }
    else if ( item.get( 'hasChildren' ) ) {
      // Else, we must unselect its children. But, in order to prevent
      // errors, we ask the user for confirmation.
      if ( !prompt || confirm( promptMessage ) ) {
        // Helper function for recursively looking up selected child
        // items.
        var recursiveUnselect = function( item ) {
          item.set( 'active', false );
          var childItems = this.itemDatabase.where({
            parentId: item.get( 'id' ),
            active:   true
          });
          for ( var i in childItems ) {
            recursiveUnselect( childItems[ i ] );
          }
        };
        recursiveUnselect( item );
      }
      else {
        // Because the item was already unselected (the event is triggered
        // after the actual property change), we must undo it and
        // re-select our item.
        item.set( 'active', true );
      }
    }
  }
};

// Extend with Backbone Events core and export.
Archibald.Core = _.extend( Core, Backbone.Events );

})( jQuery, Backbone, _, window.ArchibaldCurriculum || ( window.ArchibaldCurriculum = new Object() ) );
