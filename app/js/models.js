/**
 * @file
 * ArchibaldCurriculum data model definitions.
 */

(function(Backbone, _, Archibald) {

/**
 * Item model.
 *
 * Defines the data structure for a single item, like a Fachbereich or
 * Kompetenzstufe. Items have a reference to their parent item, via the parentId
 * attribute.
 */
Archibald.ItemModel = Backbone.Model.extend({
  defaults: {
    name: null,
    type: null,
    parentId: "root",
    active: false,
    expanded: false,
    hasChildren: false,
    data: {}
  },
  validate: function() {
    var errors = [];
    if (!this.get('name')) {
      errors.push("An item requires a name.");
    }
    if (!this.get('parentId')) {
      errors.push("An item requires a parentId.");
    }
    return errors.length ? errors : null;
  }
});

/**
 * Item collection.
 */
Archibald.ItemCollection = Backbone.Collection.extend({
  model: Archibald.ItemModel,
  url: '?dummyUrl'
});

/**
 * Column model.
 *
 * Defines the data structure for a single column. This has the particularity
 * of referencing a View, not the other way around. We use this to keep track
 * of the ItemListViews, so we can easily and cleanly manipulate them, like
 * by hiding columns "on the right" of a given column, or collapsing columns
 * "on the left".
 */
Archibald.ColumnModel = Backbone.Model.extend({
  defaults: {
    column: null
  }
});

/**
 * Column collection.
 */
Archibald.ColumnCollection = Backbone.Collection.extend({
  model: Archibald.ColumnModel,
  url: '?dummyUrl'
});

})(Backbone, _, window.ArchibaldCurriculum || (window.ArchibaldCurriculum = {}));
