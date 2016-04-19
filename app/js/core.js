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
//    (optional) An object representing the JSON database of all curriculum
//    items.
// @param {Object} wrapper
//    (optional) The jQuery object that serves as a wrapper for the application.
// @param {Object} settings
//    (optional) The settings object.
var Core = function( items, wrapper, settings ) {
  // We keep track of which instance we are. This is need to generate unique
  // IDs in certain conditions.
  this.id = ++Core.count;

  // Initialize the item database. This parses the raw data items and
  // initializes them as reusable models.
  if ( items ) {
    this.setItemDatabase( items );
  }

  // Store the application DOM wrapper.
  if ( wrapper ) {
    this.setWrapper( wrapper );
  }

  // Store the settings.
  this.setSettings( settings );

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

  // The identifier for the instance.
  id: null,

  // A hash of settings.
  settings: null,

  // Prepare an item database. This will allow us to quickly update large
  // lists of items, in case of recursive checking, for example.
  itemDatabase: null,

  // Prepare a column database. This will allow us to manipulate columns,
  // like collapsing, hiding, showing, etc.
  columnDatabase: null,

  // Prepare a reference to the application wrapper.
  $el: null,

  // Prepare a reference to the style wrapper, used when the responsive logic
  // is enabled. See `ArchibaldCuliculm.Core#activateResponsiveLogic()`.
  $style: null,

  // Prepare a reference to the maximum number of columns the application can
  // have. This is only used if the responsive logic is activated. See
  // `ArchibaldCuliculm.Core#activateResponsiveLogic()`.
  maxCols: null,

  // Prepare a reference to the application summary wrapper, if used.
  $summaryEl: null,

  // Prepare a reference to the summary view.
  summaryView: null,

  // Set or refresh the application DOM wrapper.
  //
  // @param {Object} wrapper
  //    The jQuery object that serves as a wrapper for the application.
  setWrapper: function( wrapper ) {
    this.$el = wrapper || this.$el;

    // We prefer having an ID for our wrapper. This will prevent conflicting
    // CSS rules if the responsive logic is activated. If our wrapper has no
    // ID, generate one.
    if ( typeof this.$el[ 0 ].id === 'undefined' || this.$el[ 0 ].id === '' ) {
      this.$el[ 0 ].id = 'archibald-curriculum-ui-core-' + this.id;
    }
  },

  // Get the application DOM wrapper.
  //
  // @returns {Object}
  getWrapper: function() {
    return this.$el;
  },

  // Set or refresh the application settings.
  //
  // @param {Object} settings
  //    The settings hash. Will extend with the application defaults.
  setSettings: function( settings ) {
    this.settings = _.extend( {
      // View classes.
      itemView:     Archibald.ItemView,
      itemListView: Archibald.ItemListView,
      itemInfoView: Archibald.ItemInfoView,
      summaryView:  Archibald.SummaryTreeView,

      // Behavior settings.
      recursiveCheckPromptMessage: "This will also uncheck all child items. Are you sure you want to continue?",
    }, settings || {} );
  },

  // Get the application settings.
  //
  // @returns {Object}
  getSettings: function() {
    return this.settings;
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
    this.summaryView = new this.settings.summaryView({
      collection: this.itemDatabase
    });

    // Append the summary wrapper to our application wrapper, keeping things
    // together.
    wrapper.append( this.summaryView.render().$el );

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
    return this.summaryView;
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
            typeof items[ items[ group ][ i ].id ] !== 'undefined' &&
            items[ items[ group ][ i ].id ].length
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
  //    (optional) Whether the column items are editable or not. Defaults to
  //    false.
  // @param {Boolean} collapsed
  //    (optional) Whether the column should be collapsed on creation or not.
  //    Defaults to false.
  //
  // @returns {ArchibaldCurriculum.ItemListView}
  createColumn: function( items, editable, collapsed ) {
    var column = new this.settings.itemListView({
      collection: new Archibald.ItemCollection( items ),
      editable:   !!editable,
      childView:  this.settings.itemView
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
    this.columnDatabase.add({ column: column });

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
  //    items. Defaults to false.
  recursiveCheck: function( item, prompt ) {
    prompt = !!prompt;

    // If an item is selected, we must also select all its parents.
    if ( item.get( 'active' ) ) {
      var parentId = item.get( 'parentId' ),
          parentItem;
      while ( parentId !== 'root' ) {
        parentItem = this.itemDatabase.get( parentId );
        parentItem.set( 'active', true );
        parentId = parentItem.get( 'parentId' );
      }
    }
    else if ( item.get( 'hasChildren' ) ) {
      // Else, we must unselect its children. But, in order to prevent
      // errors, we ask the user for confirmation.
      if ( !prompt || confirm( this.settings.recursiveCheckPromptMessage ) ) {
        // Helper function for recursively looking up selected child
        // items.
        var that = this;
        var recursiveUnselect = function( item ) {
          item.set( 'active', false );
          var childItems = that.itemDatabase.where({
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
  },

  // Activate responsive logic.
  //
  // The application is a bit too complex to be fully responsive using only CSS.
  // This method activates the responsive JS logic for the application, which is
  // responsible for calculating how many columns can be shown on screen.
  activateResponsiveLogic: function() {
    this.$style = $( '<style type="text/css" />' ).appendTo( 'head' );
    this.maxCols = 0;

    // Tests show a flash of unstyled content, which breaks the resize() math.
    // Allow for a tiny delay before initiating the resize calculations.
    var that = this;
    setTimeout( function() {
      // Create an invisible iframe. See
      // http://stackoverflow.com/questions/2175992/detect-when-window-vertical-scrollbar-appears
      // and https://gist.github.com/OrganicPanda/8222636.
      var $iframe = $( '<iframe class="__archibald-curricula-ui--hacky-scrollbar-resize-listener__" />' );

      // Make the iframe invisible, but still as wide as the screen.
      $iframe
        .css({
          height:  0,
          margin:  0,
          padding: 0,
          border:  0,
          width:  '100%'
        })
        .on( 'load', function() {
          // Register our event when the iframe loads. This way, we can
          // safely react on resize events.
          this.contentWindow.addEventListener( 'resize', function() {
            that.resize();
          } );
        })
        .appendTo( 'body' );

      // Trigger the initial math.
      that.resize();
    }, 100 );
  },

  // Resize helper.
  //
  // This method computes the new amount of columns that are to be shown, and
  // updates the CSS rules accordingly. It is possible to pass the expected new
  // width to the function, which will then skip the computing of the current
  // width. This is very useful when using CSS animations: the JS may trigger
  // immediately, but the CSS is still animating. By passing the expected width,
  // the JS can compute the correct sizes without interfering with the CSS
  // animations, or having to listen to animation events, which are complex.
  //
  // @param {Number} newWidth
  //    (optional) The width of the application wrapper. If not given the width
  //    will be computed based on the application wrapper's current width.
  resize: function( newWidth ) {
    if ( typeof this.$style === 'undefined' ) {
      throw "Resizing is only available if the responsive logic is activated. Call activateResponsiveLogic() first.";
    }

    var width = typeof newWidth === 'number' ? newWidth : this.$el.width(),
        oldMaxCols = this.maxCols;

    // Recompute the amount of columns we can show. For widths less than 600,
    // we only show 1. For widths between 600 and 900, we show 2; between 900
    // and 1200, we show 3, and above that, we show 4.
    this.maxCols = width < 600 ? 1 : ( width < 900 ? 2 : ( width < 1200 ? 3 : 4 ) );

    // Take 1px off, in case of rounding errors (we're looking at you, IE).
    var colWidth = Math.floor( width / this.maxCols ) - 1;

    // Update our CSS rules by updating the content of our style element.
    this.$style.text( Core.cssTemplate({
      id:    this.$el[ 0 ].id,
      width: colWidth
    }) );

    // Did we have more cols previously? If so, we need to collapse an
    // appropriate amount of columns on the left. If we have room for more, we
    // need to expand.
    // @todo Don't rely on the DOM selector we use here!
    var numExpanded = this.$el.find( '.archibald-column:not(.archibald-column--collapsed)' ).length,
        diff = Math.abs( oldMaxCols - this.maxCols );

    if ( oldMaxCols > this.maxCols && numExpanded > this.maxCols ) {
      this.columnDatabase.forEach( function( model ) {
        if ( diff && model.get( 'column' ).isExpanded() ) {
          model.get( 'column' ).collapse();
          diff--;
        }
      });
    }
    else if ( oldMaxCols < this.maxCols && numExpanded < this.maxCols ) {
      _.forEach( this.columnDatabase.toArray().reverse(), function( model ) {
        if ( diff && !model.get( 'column' ).isExpanded() ) {
          model.get( 'column' ).expand();
          diff--;
        }
      });
    }
  },

  // Unhighlight all items.
  //
  // Update all models in the item database, and set their respective
  // "highlighted" properties to false.
  // @todo Should this really be a model property?
  unhighlightItems: function() {
    var highlightedItems = this.itemDatabase.where({ highlighted: true });
    for ( var i in highlightedItems ) {
      highlightedItems[ i ].set( 'highlighted', false );
    }
  },

  // Reset all expanded items.
  //
  // Update all models in the item database, and set their respective
  // "expanded" properties to false.
  // @todo Should this really be a model property?
  resetExpandedItems: function() {
    var expandedItems = this.itemDatabase.where({ expanded: true });
    for ( var i in expandedItems ) {
      expandedItems[ i ].set( 'expanded', false );
    }
  }
};

// A counter, which keeps track of how many Core instances are instantiated.
Core.count = 0;

// A template for the dynamic CSS rules we inject for the responsive logic. See
// `ArchibaldCurriculum.Core#activateResponsiveLogic()` and
// `ArchibaldCurriculum.Core#resize()`.
Core.cssTemplate = _.template( '\
#<%= id %> .archibald-column__wrapper,\
#<%= id %> .archibald-column {\
  width: <%= width %>px;\
}\
' );

// Extend with Backbone Events core and export.
Archibald.Core = _.extend( Core, Backbone.Events );

})( jQuery, Backbone, _, window.ArchibaldCurriculum || ( window.ArchibaldCurriculum = new Object() ) );
