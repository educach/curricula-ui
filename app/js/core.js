
(function($, Backbone, _, Archibald) {

// Prepare a global item database. This will allow us to quickly update large
// lists of items, in case of recursive checking, for example.
var itemDatabase = new Archibald.ItemCollection();

// Prepare a global column database. This will allow us to manipulate columns,
// like collapsing, hiding, showing, etc.
var columnDatabase = new Archibald.ColumnCollection();
columnDatabase.on('remove', function(model) {
  model.get('column').remove();
});

// Prepare a global reference to the application wrapper.
var $wrapper;

// Prepare a global reference to the application summary wrapper, if used.
var $summaryWrapper;

// Prepare a global reference to the summary view.
var summaryTreeView;

/**
 * Set or refresh the application DOM wrapper.
 *
 * @param {Object} wrapper
 *    The jQuery object that serves as a wrapper for the application.
 */
Archibald.setWrapper = function(wrapper) {
  $wrapper = wrapper;
}

/**
 * Get the application DOM wrapper.
 *
 * @returns {Object}
 */
Archibald.getWrapper = function() {
  return $wrapper;
}

/**
 * Set or refresh the application summary DOM wrapper.
 *
 * @param {Object} wrapper
 *    The jQuery object that serves as a wrapper for the application summary.
 */
Archibald.setSummaryWrapper = function(wrapper) {
  $summaryWrapper = wrapper;

  // Empty the summary view.
  wrapper.empty();

  // Fetch all active elements from the database. We pass these to our View,
  // which will render a tree recursively.
  summaryTreeView = new Archibald.SummaryTreeView({
    collection: Archibald.getItemDatabase()
  });

  wrapper.append(summaryTreeView.render().$el);
}

/**
 * Get the application summary DOM wrapper.
 *
 * @returns {Object}
 */
Archibald.getSummaryWrapper = function() {
  return $summaryWrapper;
}

/**
 * Get the application summary view.
 *
 * @returns {Object}
 */
Archibald.getSummary = function() {
  return summaryTreeView;
}

/**
 * Set or refresh the global item database.
 *
 *  @param {Object} items
 *    An object representing the JSON database of all curriculum items.
 */
Archibald.setItemDatabase = function(items) {
  for (var group in items) {
    for (var i in items[group]) {
      Archibald.getItemDatabase().add(new Archibald.ItemModel({
        id: items[group][i].id,
        name: items[group][i].name,
        hasChildren: typeof items[items[group][i].id] !== undefined && items[items[group][i].id].length,
        data: items[group][i].data,
        parentId: group
      }));
    }
  }
};

/**
 * Get the global item database.
 *
 * @returns {ArchibaldCurriculum.ItemCollection}
 */
Archibald.getItemDatabase = function() {
  return itemDatabase;
};

/**
 * Get the global column database.
 *
 * @returns {ArchibaldCurriculum.ColumnCollection}
 */
Archibald.getColumnDatabase = function() {
  return columnDatabase;
};

/**
 * Prepare a new column.
 *
 * @param {Array} items
 *    The items to put in the column.
 * @param {Boolean} editable
 *    (optional) Whether the column items are editable or not. Defaults to true.
 * @param {Boolean} collapsed
 *    (optional) Whether the column should be collapsed on creation or not.
 *    Defaults to false.
 *
 * @returns {ArchibaldCurriculum.ItemListView}
 */
Archibald.createColumn = function(items, editable, collapsed) {
  // Editable by default.
  editable = typeof editable !== 'undefined' ? editable : true;
  var column = new Archibald.ItemListView({
    collection: new Archibald.ItemCollection(items),
    editable: editable
  });

  if (collapsed) {
    column.collapse();
  }

  // Add it to the wrapper.
  Archibald.getWrapper().append(column.render().$el);

  // Activate the nanoScroller plugin.
  // @todo Handle this in Drupal scope?
  if (typeof $.fn.nanoScroller !== 'undefined') {
    column.$el.find('.nano').nanoScroller();
  }

  Archibald.getColumnDatabase().add({ column: column});

  return column;
};

/**
 * Get the columns on the right of the passed column.
 *
 * @param {ArchibaldCurriculum.ItemListView} column
 *
 * @returns {Array}
 *    An array of ArchibaldCurriculum.ColumnModel items.
 */
Archibald.getColumnRightSiblings = function(column) {
  var index = Archibald.getColumnDatabase().indexOf(
    Archibald.getColumnDatabase().findWhere({ column: column })
  );
  if (Archibald.getColumnDatabase().length > index + 1) {
    return Archibald.getColumnDatabase().slice(index + 1);
  }
  else {
    return [];
  }
};

/**
 * Get the columns on the left of the passed column.
 *
 * @returns {Array}
 *    An array of ArchibaldCurriculum.ColumnModel items.
 */
Archibald.getColumnLeftSiblings = function(column) {
  var index = Archibald.getColumnDatabase().indexOf(
    Archibald.getColumnDatabase().findWhere({ column: column })
  );
  return Archibald.getColumnDatabase().slice(0, index);
};

/**
 * Helper function to recursively "check" or "uncheck" items.
 *
 * @param {ArchibaldCurriculum.ItemModel} item
 *    The item from which the recursive (un)checking must start.
 * @param {Boolean} prompt
 *    (optional) Whether to prompt the user in case of recursively unchecking
 *    items. Defaults to true.
 * @param {String} promptMessage
 *    (optional) If the user must be prompted, this message will be used.
 *    Defaults to "This will also uncheck all child items. Are you sure you want
 *    to continue?"
 */
Archibald.recursiveCheck = function(item, prompt, promptMessage) {
  prompt = !!prompt;
  promptMessage = promptMessage || "This will also uncheck all child items. Are you sure you want to continue?";

  // If an item is selected, we must also select all its parents.
  if (item.get('active')) {
    var parentId = item.get('parentId'),
        parentItem;
    while (parentId !== 'root') {
      parentItem = Archibald.getItemDatabase().get(parentId);
      parentItem.set('active', true);
      parentId = parentItem.get('parentId');
    }
  }
  else if (item.get('hasChildren')) {
    // Else, we must unselect its children. But, in order to prevent
    // errors, we ask the user for confirmation.
    if (!prompt || confirm(promptMessage)) {
      // Helper function for recursively looking up selected child
      // items.
      var recursiveUnselect = function(item) {
        item.set('active', false);
        var childItems = Archibald.getItemDatabase().where({
          parentId: item.get('id'),
          active: true
        });
        for (var i in childItems) {
          recursiveUnselect(childItems[i]);
        }
      };
      recursiveUnselect(item);
    }
    else {
      // Because the item was already unselected (the event is triggered
      // after the actual property change), we must undo it and
      // re-select our item.
      item.set('active', true);
    }
  }
};

})(jQuery, Backbone, _, window.ArchibaldCurriculum || (window.ArchibaldCurriculum = {}));
