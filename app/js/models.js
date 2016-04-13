/**
 * @file
 * Archibald Curriculum JS application models.
 *
 * This defines the models used throughout the application. Note that this file
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

// This defines the models and collections used throughout the application.
// They extend the global `ArchibaldCurriculum` namespace, aliased to
// `Archibald` for readability.

// A note on Backbone
// ------------------
//
// As all the models and collections are extending *Backbone*, it is useful to
// see the official documentation on
// [Backbone.Model](http://backbonejs.org/#Model) and
// [Backbone.Collection](http://backbonejs.org/#Collection).


// Item model
// ---------
//
// Defines the data structure for a single item, like a Fachbereich or
// Kompetenzstufe. Items have a reference to their parent item, via the parentId
// attribute.
Archibald.ItemModel = Backbone.Model.extend({
  defaults: {
    name:        null,
    type:        null,
    parentId:    "root",
    active:      false,
    expanded:    false,
    hasChildren: false,
    data:        {}
  },
  // The model validates itself, checking that it received a valid name, as well
  // as a non-null parent identifier.
  validate: function() {
    var errors = [];
    if ( !this.get( 'name' ) ) {
      errors.push( "An item requires a name." );
    }
    if ( !this.get( 'parentId' ) ) {
      errors.push( "An item requires a parentId." );
    }
    return errors.length ? errors : null;
  }
});

// Item collection
// ---------------
//
// A collection of `ArchibaldCurriculum.ItemModel` models.
Archibald.ItemCollection = Backbone.Collection.extend({
  model: Archibald.ItemModel,
  // Backbone complains if no URL is defined. We could depend on the
  // localStorage plugin for Backbone to prevent this error, but that would be
  // overkill, as we only keep things in memory. Instead, provide a dummy URL.
  url:   '?dummyUrl'
});

// Column model
// ------------
//
// Defines the data structure for a single column. This has the particularity
// of referencing a *View*, not the other way around. We use this to keep track
// of the `ArchibaldCurriculum.ItemListView` elements used in the application,
// so we can easily and cleanly manipulate them, like by hiding columns "to the
// right" of a given column, or collapsing columns "to the left".
Archibald.ColumnModel = Backbone.Model.extend({
  defaults: {
    column: null
  }
});

// Column collection
// -----------------
//
// A collection of `ArchibaldCurriculum.ColumnModel` models.
Archibald.ColumnCollection = Backbone.Collection.extend({
  model: Archibald.ColumnModel,
  // Backbone complains if no URL is defined. We could depend on the
  // localStorage plugin for Backbone to prevent this error, but that would be
  // overkill, as we only keep things in memory. Instead, provide a dummy URL.
  url:   '?dummyUrl'
});

})( Backbone, _, window.ArchibaldCurriculum || ( window.ArchibaldCurriculum = new Object() ) );
