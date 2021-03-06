/**
 * @file
 * Curricula UI JS application core.
 *
 * This defines the core class that initializes the application. It can be
 * considered as the "controller" for the views and models.
 */

"use strict";
( function( $, Backbone, _, c ) {


/**
 * Templates
 *
 * This defines the default templates used by the core application. They
 * can be overridden in various cases, as needed. Curricula UI strictly
 * adheres to *BEM* notation for the markup, and overrides should follow suit.
 */
c.templates =  _.extend({

  /**
   * CSS rules
   *
   * A template for the dynamic CSS rules we inject for the responsive logic.
   * See CurriculaUI.Core#activateResponsiveLogic() and
   * CurriculaUI.Core#resize().
   */
  css: '\
#<%= id %> .curricula-ui__column__wrapper,\
#<%= id %> .curricula-ui__column {\
  width: <%= width %>px;\
}',

  /**
   * Main application markup
   *
   * This defines the main application body markup, which will be injected into
   * the DOM wrapper that contains the application.
   * @todo
   * - nano classes?
   * - IDs
   */
  app: '\
<div class="curricula-ui">\
  <div class="curricula-ui__row">\
    <h3><%= typeof editorLabel !== "undefined" ? editorLabel : "Editor" %></h3>\
    <div class="curricula-ui__item-info-wrapper"></div>\
    <div class="curricula-ui__editor curricula-ui__row">\
    </div>\
  </div>\
  <div class="curricula-ui__row curricula-ui__summary-wrapper">\
    <h3 class="curricula-ui__summary-wrapper__label"><%= typeof summaryLabel !== "undefined" ? summaryLabel : "Summary" %></h3>\
    <div class="curricula-ui__summary-wrapper__content">\
    </div>\
  </div>\
</div>\
'

}, c.templates || {});

/**
 * Core
 *
 * The Core class is the is the central part of the application. It ties the
 * models and views together, and is responsible for managing the UI in an
 * intuitive manner. It provides many settings to change aspects of its
 * behavior, and triggers many events, giving other libraries and modules much
 * flexibility in order to alter and enhance the application workflow.
 *
 * @param {Object} items
 *    (optional) An object representing the JSON database of all curriculum
 *    items.
 * @param {Object} wrapper
 *    (optional) The jQuery object that serves as a wrapper for the application.
 * @param {Object} settings
 *    (optional) The settings object.
 */
var Core = function( items, wrapper, settings ) {
  // We keep track of which instance we are. This is need to generate unique
  // IDs in certain conditions.
  this.id = ++Core.count;

  // Store the settings. This must be done first.
  this.setSettings( settings );

  // Initialize the item database. This parses the raw data items and
  // initializes them as reusable models.
  if ( items ) {
    this.setItemDatabase( items );
  }

  // Store the application DOM wrapper.
  if ( wrapper ) {
    this.setWrapper( wrapper );
  }

  // Initialize the column database. This will hold all column views (yes,
  // views) that are currently available "on screen". This way of referencing
  // views using models and a collection allows us to perform actions based
  // on column "location" much faster than traversing the DOM. It also allows
  // us to cleanly keep track of what columns are available.
  this.columnDatabase = new c.ColumnCollection();
  this.columnDatabase.on( 'remove', function( model ) {
    model.get( 'column' ).remove();
  });
};

// Extend the CurriculaUI.Core prototype.
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
  // is enabled. See CurriculaUI.Core#activateResponsiveLogic().
  $style: null,

  // Prepare a reference to the maximum number of columns the application can
  // have. This is only used if the responsive logic is activated. See
  // CurriculaUI.Core#activateResponsiveLogic().
  maxCols: null,

  // Prepare a reference to the summary view.
  summaryView: null,

  // Prepare a reference to the search view.
  searchView: null,

  // Prepare a reference to the item info view.
  itemInfoView: null,

  /**
   * Set or refresh the application DOM wrapper.
   *
   * @param {Object} wrapper
   *    The jQuery object that serves as a wrapper for the application.
   */
  setWrapper: function( wrapper ) {
    // If we already had a wrapper, empty it.
    if ( typeof this.$el !== 'undefined' && this.$el ) {
      this.$el.empty();
    }

    // Set the new wrapper, or re-use the old one if none is given.
    this.$el = wrapper || this.$el;

    // We prefer having an ID for our wrapper. This will prevent conflicting
    // CSS rules if the responsive logic is activated. If our wrapper has no
    // ID, generate one.
    if ( typeof this.$el[ 0 ].id === 'undefined' || this.$el[ 0 ].id === '' ) {
      this.$el[ 0 ].id = 'curricula-ui-core-' + this.id;
    }

    // Render the application markup.
    this.$el.html( this.settings.templates.app({
      editorLabel:  this.settings.editorLabel  ? this.settings.editorLabel  : undefined,
      summaryLabel: this.settings.summaryLabel ? this.settings.summaryLabel : undefined,
    }) );
    this.triggerEvent( 'app', 'render', this );

    // Add the item info element to the markup.
    this.updateItemInfo();

    // Activate the summary logic.
    this.activateSummary();

    // Activate the search logic.
    this.activateSearch();

    // Recompute the amount of columns we can show.
    this.computeMaxCols();
  },

  /**
   * Get the application DOM wrapper.
   *
   * @returns {Object}
   */
  getWrapper: function() {
    return this.$el;
  },

  /**
   * Set or refresh the application settings.
   *
   * @param {Object} settings
   *    The settings hash. Will extend with the application defaults.
   */
  setSettings: function( settings ) {
    var that = this,
        defaults = {
          // View classes.
          itemView:     c.ItemView,
          itemListView: c.ItemListView,
          itemInfoView: c.ItemInfoView,
          summaryView:  c.SummaryTreeView,
          searchView:   c.SearchView,

          // Behavior settings.
          recursiveCheckPrompt:        false,
          recursiveCheckPromptMessage: "This will also uncheck all child items. Are you sure you want to continue?",
          useSearch:                   true,
          useItemInfo:                 true,
          editorLabel:                 false,
          summaryLabel:                false,

          // Templates.
          templates: {
            app: _.template( c.templates.app ),
            css: _.template( c.templates.css )
          },

          // Event callbacks.
          events: {
            // On selecting an item, check if a new column must be spawned.
            // This only applies to an item that actually has children. If a new
            // column is to be created, collapse all sibling columns to the
            // "right".
            "item:select": function( item, columnCollection, column ) {
              // Update the item information.
              that.updateItemInfo( item );

              // If this item has no children, or it is "expanded", we don't add
              // a new column.
              /* istanbul ignore if */
              if ( !item.get( 'hasChildren' ) || item.get( 'expanded' ) ) {
                return;
              }

              // We first need to collapse all sibling *columns* to the right,
              // if any. Simply remove them.
              that.columnDatabase.remove(
                that.getColumnRightSiblings( column )
              );

              // It is possible some items were highlighted. Unhighlight them.
              that.unhighlightItems();

              // Get all expanded sibling *items* in the column (should only be
              // one, but we use a failsafe logic and treat it as an array) and
              // update their "expanded" property.
              var siblingExpandedItems = columnCollection.where({ expanded: true });
              if ( siblingExpandedItems.length ) {
                for ( var i in siblingExpandedItems ) {
                  siblingExpandedItems[ i ].set( 'expanded', false );
                }
              }

              // Get the item that was clicked and set its "expanded" property
              // to true.
              item.set( 'expanded', true );

              // Create the new column, collapsed and editable by default.
              var newColumn = that.createColumn(
                that.itemDatabase.where({ parentId: item.get( 'id' ) }),
                true,
                true
              );

              // Make sure none of its children are "expanded".
              var expandedItems = that.itemDatabase.where({
                parentId: item.get( 'id' ),
                expanded: true
              });
              if ( expandedItems.length ) {
                for ( var i in expandedItems ) {
                  expandedItems[ i ].set( 'expanded', false );
                }
              }

              // If there are more than maxCols columns visible, hide the
              // first ones. Expand the others, as a failsafe.
              if ( that.maxCols ) {
                var leftSiblings = that.getColumnLeftSiblings( newColumn ),
                    leftSiblingsCount = leftSiblings.length;
                if ( leftSiblingsCount >= that.maxCols ) {
                  _.each( leftSiblings, function( element, i ) {
                    var column = element.get( 'column' );
                    if ( leftSiblingsCount - i >= that.maxCols ) {
                      column.collapse();
                    } else {
                      column.expand();
                    }
                  });
                }
              }

              // Show the new column.
              newColumn.expand();
            },
            // This callback will handle the recursive checking or unchecking of
            // parents and children items, respectively, upon changing the state
            // of one item.
            "item:change": function( item, columnCollection, column ) {
              that.recursiveCheck( item, that.settings.recursiveCheckPrompt );
            },
            // This callback will handle the selection of an item and the
            // expanding of the editor columns to show that specific item.
            // Although it was originally used for the summary:item:select
            // event, it can also be used in other situations, like the
            // search:item:select event.
            "summary:item:select": function( selectedItem, collection ) {
              // First, fully collapse all the columns, except the "root" one.
              // Get the first column element from the database.
              var column = that.columnDatabase.first().get( 'column' );

              // Expand it.
              column.expand();

              // Remove all other columns on the right.
              that.columnDatabase.remove(
                that.getColumnRightSiblings( column )
              );

              // Construct the hierarchy as an array.
              var items = [],
                  item = selectedItem;
              while ( item.get( 'parentId' ) !== 'root' ) {
                items.push( item );
                item = collection.get( item.get( 'parentId' ) );
              }
              items.push( item );

              // Reverse it, and remove the last item (we don't expand the
              // selected item).
              items.reverse().pop();

              // Make sure none of the items in the database are "expanded" or
              // "highlighted".
              var expandedItems = that.itemDatabase.where({ expanded: true });
              if ( expandedItems.length ) {
                for ( var i in expandedItems ) {
                  expandedItems[ i ].set( 'expanded', false );
                }
              }
              that.unhighlightItems();

              // Now, loop through the selected item's hierarchy, and trigger
              // the "item:select" event, updating the column reference every
              // time.
              for ( var i in items ) {
                column.trigger(
                  'item:select',
                  items[ i ],
                  new CurriculaUI.ItemCollection(),
                  column,
                  {}
                );

                // Update the column reference, so we trigger it on the correct
                // one on the next pass.
                column = that.columnDatabase.last().get( 'column' );
              }

              // Finally, highlight the selected item, and scroll to it, both in
              // the main window AND inside the column.
              selectedItem.set( 'highlighted', true );

              // @todo Make this a method of the View itself!
              /* istanbul ignore if */
              if ( typeof $.fn.nanoScroller !== 'undefined' ) {
                var $element = column.$el.find( '[data-model-id="' + selectedItem.get( 'id' ) + '"]' );
                if ( $element.length ) {
                  column.$el.find( '.nano' ).nanoScroller({
                    scrollTo: $element
                  });
                }
              }
              $( 'body, html' ).stop().animate({
                scrollTop: ( that.$el.offset().top - 50 ) + 'px'
              });
            },
            // Re-usable function for handling "go back" events.
            // Whenever the "Back" button is clicked,
            // This callback will handle the "go back" events.  Whenever the
            // "Back" button is clicked, we want to show the parent column
            // again.
            "column:go-back": function( columnCollection, column ) {
              // It is possible some items were highlighted. Unhighlight them.
              that.unhighlightItems();

              // Remove the item info.
              that.updateItemInfo();

              // If there's a previous column, show it, and collapse the last
              // one.
              var prev = _.last( that.getColumnLeftSiblings( column ) ),
                  last = _.last( that.getColumnRightSiblings( column ) );

              if ( prev ) {
                prev.get( 'column' ).expand();
              }

              if ( last ) {
                that.columnDatabase.remove( last );
              }

              // Remove the expanded attribute on the new last column items.
              last = that.columnDatabase.last();
              var expandedItems = last.get( 'column' ).collection.where({ expanded: true });
              if ( expandedItems.length ) {
                for ( var i in expandedItems ) {
                  expandedItems[ i ].set( 'expanded', false );
                }
              }
            },
            // This callback will handle the "go to root" events.  Whenever the
            // "Top" button is clicked, we want to show only the top-most parent
            // column.
            "column:go-to-root": function( columnCollection, column ) {
              // It is possible some items were highlighted or expanded. Remove
              // these attributes.
              that.unhighlightItems();
              that.resetExpandedItems();

              // Remove the item info.
              that.updateItemInfo();

              // Fetch the first column, and "collapse" all others. We don't
              // actually collapse them, we completely remove them instead.
              var firstColumn = that.columnDatabase.first();
              that.columnDatabase.remove(
                that.getColumnRightSiblings( firstColumn.get( 'column' ) )
              );

              // Make sure the first column is expanded.
              firstColumn.get( 'column' ).expand();
            }
          }
        };

    this.settings = _.extend( defaults, settings || {} );
  },

  /**
   * Get the application settings.
   *
   * @returns {Object}
   */
  getSettings: function() {
    return this.settings;
  },

  /**
   * Activate the application summary logic.
   */
  activateSummary: function() {
    if ( !this.summaryView || !this.summaryView.$el.length ) {
      // Pass our item database to the summary view, which will automatically
      // pick out the active elements, and render them.
      this.summaryView = new this.settings.summaryView({
        collection: this.itemDatabase
      });

      var that = this;
      this.summaryView.on( 'item:select', this.settings.events[ 'summary:item:select' ] );

      // Append the summary to our application wrapper.
      this.$el.find( '.curricula-ui__summary-wrapper__content' ).html( this.summaryView.render().$el );

      // Allow all events to bubble up.
      this.summaryView.on( 'all', function( event ) {
        // Get the remaining arguments, removing the event name.
        var args = Array.prototype.slice.call( arguments, 1 );

        // Add the application itself.
        args.push( that );

        // Bubble it up.
        that.triggerEvent.apply(
          that,
          [ 'summary', event ].concat( args )
        );
      } );
    }
  },

  /**
   * Activate the application search logic.
   */
  activateSearch: function() {
    if ( this.settings.useSearch && ( !this.searchView || !this.searchView.$el.length ) ) {
      var that = this;
      this.searchView = new this.settings.searchView({
        collection: this.itemDatabase
      });

      // Add a keyboard shortcut for the search component. When a user uses
      // Ctrl+Shift+F, show the search field.
      /* istanbul ignore next */
      $( this.$el[0].ownerDocument ).keyup( function( e ) {
        if ( e.key.toLowerCase() === 'f' && e.shiftKey && e.ctrlKey ) {
          that.showSearch( true );
        } else if ( e.key.toLowerCase() === 'escape' ) {
          that.searchView.remove();
        }
      })

      // On cancel, completely remove the search component from the application.
      this.searchView.on( 'cancel', function( collection, view ) {
        that.searchView.remove();
      });

      // On selecting an element, expand the editor to it. We use the same event
      // as the summary:item:select event, because the passed arguments are
      // almost identical. We also close the element.
      this.searchView.on( 'select', this.settings.events[ 'summary:item:select' ] );
      this.searchView.on( 'select', function( collection, view ) {
        that.searchView.remove();
      });

      // Allow all events to bubble up.
      this.searchView.on( 'all', function( event ) {
        // Get the remaining arguments, removing the event name.
        var args = Array.prototype.slice.call( arguments, 1 );

        // Add the application itself.
        args.push( that );

        // Bubble it up.
        that.triggerEvent.apply(
          that,
          [ 'search', event ].concat( args )
        );
      } );
    }
  },

  /**
   * Show the search component.
   *
   * Show the search component element on screen. If the focus parameter is
   * set to true, the search input will immediately get focus.
   *
   * @param {Boolean} focus
   *    Give focus to the search input. Defaults to false.
   */
  showSearch: function( focus ) {
    this.$el.append( this.searchView.render().$el );
    /* istanbul ignore if */
    if ( focus ) {
      this.searchView.$el.find( 'input' ).focus();
    }
  },

  /**
   * Set or refresh the global item database.
   *
   * Calling this function will purge the existing item database, and replace
   * all items with the new ones.
   *
   * @param {Object} items
   *    An object representing the JSON database of all curriculum items.
   */
  setItemDatabase: function( items ) {
    this.itemDatabase = new c.ItemCollection();

    for ( var group in items ) {
      for ( var i in items[ group ] ) {
        this.itemDatabase.add( new c.ItemModel( _.extend( {
          parentId:    group,
          hasChildren: !!(
            typeof items[ items[ group ][ i ].id ] !== 'undefined' &&
            items[ items[ group ][ i ].id ].length
          )
        }, items[ group ][ i ] ) ) );
      }
    }
  },

  /**
   * Get the global item database.
   *
   * @returns {CurriculaUI.ItemCollection}
   */
  getItemDatabase: function() {
    return this.itemDatabase;
  },

  /**
   * Get the global column database.
   *
   * @returns {CurriculaUI.ColumnCollection}
   */
  getColumnDatabase: function() {
    return this.columnDatabase;
  },

  /**
   * Prepare the application root column.
   *
   * This requires the item database to be set. If this method is called when
   * there already are columns, it will throw an error.
   *
   * @param {Boolean} editable
   *    (optional) Whether the column items are editable or not. Defaults to
   *    false.
   *
   * @returns {CurriculaUI.ItemListView}
   */
  createRootColumn: function( editable ) {
    if ( this.columnDatabase.length ) {
      throw "Cannot create a root column: there is already a column present.";
    }
    return this.createColumn( this.itemDatabase.where({ parentId: "root" }), editable );
  },

  /**
   * Prepare a new column.
   *
   * @param {Array} items
   *    The items to put in the column.
   * @param {Boolean} editable
   *    (optional) Whether the column items are editable or not. Defaults to
   *    false.
   * @param {Boolean} collapsed
   *    (optional) Whether the column should be collapsed on creation or not.
   *    Defaults to false.
   *
   * @returns {CurriculaUI.ItemListView}
   */
  createColumn: function( items, editable, collapsed ) {
    var column = new this.settings.itemListView({
      collection: new c.ItemCollection( items ),
      editable:   !!editable,
      childView:  this.settings.itemView
    });

    // Must the column be collapsed by default?
    if ( collapsed ) {
      column.collapse();
    }

    // Add our new column to our column database.
    this.columnDatabase.add({ column: column });

    // Bind our event listener, if it exists.
    var eventList = [
      'item:select',
      'item:change',
      'column:go-back',
      'column:go-to-root'
    ];
    for ( var event in eventList ) {
      if ( typeof this.settings.events[ eventList[ event ] ] !== 'undefined' ) {
        column.on( eventList[ event ], this.settings.events[ eventList[ event ] ] );
      }
    }

    // Allow all events to bubble up.
    var that = this;
    column.on( 'all', function( event ) {
      // Get the remaining arguments, removing the event name.
      var args = Array.prototype.slice.call( arguments, 1 );

      // Add the application itself.
      args.push( that );

      // Bubble it up.
      that.triggerEvent.apply(
        that,
        [ 'column', event ].concat( args )
      );
    } );

    // Add it to the wrapper.
    this.$el.find( '.curricula-ui__editor' ).append( column.render().$el );

    // Activate the nanoScroller plugin.
    /* istanbul ignore if */
    if ( typeof $.fn.nanoScroller !== 'undefined' ) {
      column.$el.find( '.nano' ).nanoScroller();
    }

    return column;
  },

  /**
   * Get the columns to the right of the passed column.
   *
   * @param {CurriculaUI.ItemListView} column
   *
   * @returns {Array}
   *    An array of CurriculaUI.ColumnModel items.
   */
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

  /**
   * Get the columns to the left of the passed column.
   *
   * @returns {Array}
   *    An array of CurriculaUI.ColumnModel items.
   */
  getColumnLeftSiblings: function( column ) {
    var index = this.columnDatabase.indexOf(
      this.columnDatabase.findWhere({ column: column })
    );
    return this.columnDatabase.slice( 0, index );
  },

  /**
   * Helper function to recursively "check" or "uncheck" items.
   *
   * @param {CurriculaUI.ItemModel} item
   *    The item from which the recursive (un)checking must start.
   * @param {Boolean} prompt
   *    (optional) Whether to prompt the user in case of recursively unchecking
   *    items. Defaults to false.
   */
  recursiveCheck: function( item, prompt ) {
    prompt = !!prompt;
    var updated = [];

    // If an item is selected, we must also select all its parents.
    if ( item.get( 'active' ) ) {
      updated.push( item );

      var parentId = item.get( 'parentId' ),
          parentItem;
      while ( parentId !== 'root' ) {
        parentItem = this.itemDatabase.get( parentId );
        parentItem.set( 'active', true );
        parentId = parentItem.get( 'parentId' );
        updated.push( parentItem );
      }
    }
    else if ( item.get( 'hasChildren' ) ) {
      // Else, we must unselect its children. But, in order to prevent
      // errors, we ask the user for confirmation.
      if ( !prompt || confirm( this.settings.recursiveCheckPromptMessage ) ) {
        updated.push( item );

        // Helper function for recursively looking up selected child
        // items.
        var that = this;
        var recursiveUnselect = function( item ) {
          updated.push( item );
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

    if ( updated.length ) {
      this.triggerEvent(
        'items',
        [ 'change', 'active' ],
        new c.ItemCollection( updated ),
        this.itemDatabase
      );
    }
  },

  /**
   * Activate responsive logic.
   *
   * The application is a bit too complex to be fully responsive using only CSS.
   * This method activates the responsive JS logic for the application, which is
   * responsible for calculating how many columns can be shown on screen.
   */
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
      var $iframe = $( '<iframe class="__curricula-ui__curricula-ui--hacky-scrollbar-resize-listener__" />' );

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
          this.contentWindow.addEventListener( 'resize', /* istanbul ignore next */ function() {
            that.resize();
          } );
        })
        .appendTo( that.$el );

      // Trigger the initial math.
      that.resize();
    }, 100 );
  },

  /**
   * Method to compute how many columns can be visible.
   *
   * This method computes the new amount of columns that are to be shown. It is
   * possible to pass the expected new width to the function, which will then
   * skip the computing of the current application wrapper's width. This is
   * very useful when using CSS animations: the JS may trigger
   * immediately, but the CSS is still animating. By passing the expected width,
   * the JS can compute the correct sizes without interfering with the CSS
   * animations, or having to listen to animation events, which are complex.
   *
   * @param {Number} width
   *    (optional) The width of the application wrapper. If not given the width
   *    will be computed based on the application wrapper's current width.
   */
  computeMaxCols: function( width ) {
    width = typeof width === 'number' ? width : this.$el.find( '.curricula-ui__editor').width();

    // Recompute the amount of columns we can show. For widths less than 600,
    // we only show 1. For widths between 600 and 900, we show 2; between 900
    // and 1200, we show 3, and above that, we show 4.
    this.maxCols = width < 600 ? 1 : ( width < 900 ? 2 : ( width < 1200 ? 3 : 4 ) );
  },

  /**
   * Resize helper.
   *
   * This method computes the new amount of columns that are to be shown, and
   * updates the CSS rules accordingly. See
   * CurriculaUI#computeMaxCols() for more information.
   *
   * @param {Number} newWidth
   *    (optional) The width of the application wrapper. If not given the width
   *    will be computed based on the application wrapper's current width.
   */
  resize: function( newWidth ) {
    /* istanbul ignore if */
    if ( typeof this.$style === 'undefined' ) {
      throw "Resizing is only available if the responsive logic is activated. Call activateResponsiveLogic() first.";
    }

    var width = typeof newWidth === 'number' ? newWidth : this.$el.find( '.curricula-ui__editor').width(),
        oldMaxCols = this.maxCols;

    // Recompute the amount of columns we can show.
    this.computeMaxCols( width );

    // Take 1px off, in case of rounding errors (we're looking at you, IE).
    var colWidth = Math.floor( width / this.maxCols ) - 1;

    // Update our CSS rules by updating the content of our style element.
    this.$style.text( this.settings.templates.css({
      id:    this.$el[ 0 ].id,
      width: colWidth
    }) );

    // Did we have more cols previously? If so, we need to collapse an
    // appropriate amount of columns on the left. If we have room for more, we
    // need to expand.
    // @todo Don't rely on the DOM selector we use here!
    var numExpanded = this.$el.find( '.curricula-ui__column:not(.curricula-ui__column--collapsed)' ).length,
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

  /**
   * Unhighlight all items.
   *
   * Update all models in the item database, and set their respective
   * "highlighted" properties to false.
   * @todo Should this really be a model property?
   */
  unhighlightItems: function() {
    var highlightedItems = this.itemDatabase.where({ highlighted: true });
    if ( highlightedItems.length ) {
      for ( var i in highlightedItems ) {
        highlightedItems[ i ].set( 'highlighted', false );
      }
      this.triggerEvent(
        'items',
        [ 'change', 'highlighted' ],
        new c.ItemCollection( highlightedItems ),
        this.itemDatabase
      );
    }
  },

  /**
   * Reset all expanded items.
   *
   * Update all models in the item database, and set their respective
   * "expanded" properties to false.
   * @todo Should this really be a model property?
   */
  resetExpandedItems: function() {
    var expandedItems = this.itemDatabase.where({ expanded: true });
    if ( expandedItems.length ) {
      for ( var i in expandedItems ) {
        expandedItems[ i ].set( 'expanded', false );
      }
      this.triggerEvent(
        'items',
        [ 'change', 'expanded' ],
        new c.ItemCollection( expandedItems ),
        this.itemDatabase
      );
    }
  },

  /**
   * Helper function to trigger an event.
   *
   * @param {String} category
   *    The category for which the event is triggered. Examples:
   *    - "items" for the item database.
   *    - "summary" for the summary view.
   *    - "columns" for the column database.
   * @param {Array} chain
   *    A chain of events, which will trigger multiple even variants. For
   *    example, passing [ "change", "active" ] for the "items" category
   *    will trigger the following events:
   *    - items:change
   *    - items:change:active
   * @param ...
   *    (optional) Any other parameters will simply be passed to the event
   *    listeners, in order.
   */
  triggerEvent: function( category, chain ) {
    // Get the remaining arguments, if any.
    var args = Array.prototype.slice.call( arguments, 2 );

    // Add the application itself.
    args.push( this );

    // Make sure the chain is an array.
    if ( !Array.isArray( chain ) ) {
      chain = [ chain ];
    }

    // Trigger multiple events, based on the chain elements. Each element in the
    // chain triggers an event in the given category.
    for ( var i = 1, len = chain.length; i <= len; i++ ) {
      this.trigger.apply(
        this,
        [ category + ':' + chain.slice( 0, i ).join( ':' ) ].concat( args )
      );
    }
  },


  /**
   * Update the item information.
   *
   * If no item is passed, will render an "empty" item information drawer.
   *
   * @param {CurriculaUI.ItemModel} item
   *    (optional) The item for which we want to render the information, or null
   *    to reset the information drawer.
   */
  updateItemInfo: function( item ) {
    // Do we use the item info? If not, skip this.
    /* istanbul ignore if */
    if ( !this.settings.useItemInfo ) {
      return;
    }

    // Do we already have an item info view? If not, create it now, and add it
    // to our application markup.
    if ( !this.itemInfoView || !this.itemInfoView.$el.length ) {
      this.itemInfoView = new this.settings.itemInfoView();
      this.$el.find( '.curricula-ui__item-info-wrapper' ).empty().append(
        this.itemInfoView.render().$el
      );

      // Pass the new width to the resize function. This will allow us to
      // still have CSS transitions, without relying on complex JS events,
      // which are hard to control and could slow down the application.
      // WARNING: this width is hard coded!! See CSS file!!
      // We use the total expanded width minus the collapsed width, which
      // gives us the difference in width for the wrapper.
      var itemInfoWidth = 270, // 300 - 30
          that = this;

      this.itemInfoView.on( 'collapse', function() {
        that.resize( that.$el.find( '.curricula-ui__editor').width() + itemInfoWidth );
      });
      this.itemInfoView.on( 'expand', function() {
        that.resize( that.$el.find( '.curricula-ui__editor').width() - itemInfoWidth );
      });

      /* istanbul ignore if */
      if ( typeof $.fn.nanoScroller !== 'undefined' ) {
        this.itemInfoView.on( 'render', function() {
          this.$el.find( '.nano' ).nanoScroller();
        });
      }

      // Bubble up all item info events.
      this.itemInfoView.on( 'all', function( event ) {
        // Get the remaining arguments, removing the event name.
        var args = Array.prototype.slice.call( arguments, 1 );

        // Add the application itself.
        args.push( that );

        // Bubble it up.
        that.triggerEvent.apply(
          that,
          [ 'item-info', event ].concat( args )
        );
      } );
    } else {
      // Reset the item info model, and re-render.
      this.itemInfoView.model = typeof item !== 'undefined' ? item : null;
      this.itemInfoView.render();
    }
  }
};

// A counter, which keeps track of how many Core instances are instantiated.
Core.count = 0;

// Extend core prototype with Backbone Events.
Core.prototype = _.extend( Core.prototype, Backbone.Events );

// Export.
c.Core = Core;

})( jQuery, Backbone, _, window.CurriculaUI || ( window.CurriculaUI = new Object() ) );
