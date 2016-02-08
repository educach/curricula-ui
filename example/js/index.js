(function($) {

// In case of noConflict mode.
Backbone.$ = $;

var appInit = function() {
  var variant = window.location.search.replace("?", "") || 'lp21';
  $.ajax({
    url: 'json/' + variant + '_full.json',
    dataType: 'json',
    success: function(items) {
      // First, create a large database of all items.
      ArchibaldCurriculum.setItemDatabase(items);
      var itemDatabase = ArchibaldCurriculum.getItemDatabase();

      // Fetch the row and pass it to the application as the DOM wrapper.
      ArchibaldCurriculum.setWrapper($('#archibald-editor-content'));

      // Max columns and width logic.
      var $style = $('<style type="text/css" />').appendTo('head'),
          maxCols = 0;

      // Prepare a re-usable function.
      var onResize = function() {
        var width = ArchibaldCurriculum.getWrapper().width(),
            oldMaxCols = maxCols;

        maxCols = width < 600 ? 1 : (width < 900 ? 2 : (width < 1200 ? 3 : 4));

        // Take 1px off, in case of rounding errors.
        var colWidth = Math.floor(width / maxCols) - 1;
        $style.text('.archibald-column__wrapper, .archibald-column { width: ' + colWidth + 'px; }');

        // Did we have more cols previously? If so, we need to collapse an
        // appropriate amount of columns on the left.
        // @todo Don't rely on the DOM selector we use here!
        if (oldMaxCols > maxCols && $('.archibald-column:not(.archibald-column--collapsed)').length > maxCols) {
          var diff = oldMaxCols - maxCols,
              columnDatabase = ArchibaldCurriculum.getColumnDatabase();

          columnDatabase.forEach(function(model) {
            if (diff && model.get('column').isExpanded()) {
              model.get('column').collapse();
              diff--;
            }
          });
        }
      };

      // Tests show a flash of unstyled content, which breaks the below math.
      // Allow for a tiny delay before initiating the calculations.
      setTimeout(function() {
        // Create an invisible iframe. See
        // http://stackoverflow.com/questions/2175992/detect-when-window-vertical-scrollbar-appears
        // and https://gist.github.com/OrganicPanda/8222636.
        var $iframe = $('<iframe id="__hacky-scrollbar-resize-listener__" />');
        $iframe
          .css({
            height: 0,
            margin: 0,
            padding: 0,
            border: 0,
            width: '100%'
          })
          .on('load', function() {
            // Register our event when the iframe loads. This way, we can
            // safely react on resize events.
            this.contentWindow.addEventListener('resize', onResize);
          })
          .appendTo('body');

        // Trigger the initial math.
        onResize();
      }, 100);

      // Re-usable function for disabling all highlights.
      // It is possible some items were highlighted. Whenever we click
      // somewhere, we want to remove all highlighting.
      var unhighlight = function() {
        var highlightedItems = ArchibaldCurriculum.getItemDatabase().where({ highlighted: true });
        for (var i in highlightedItems) {
          highlightedItems[i].set('highlighted', false);
        }
      };

      // Re-usable function for disabling all expands.
      var unexpand = function() {
        var expandedItems = ArchibaldCurriculum.getItemDatabase().where({ expanded: true });
        for (var i in expandedItems) {
          expandedItems[i].set('expanded', false);
        }
      };

      // Re-usable function for handling "select" events.
      // This callback will handle the "collapsing" of existing columns (if
      // needed) and add new columns.
      var addColumn = function(itemModel, columnCollection, column, e) {
        // If this item has no children, we don't add a new column.
        if (!itemModel.get('hasChildren')) {
          return;
        }

        // If this item is already expanded, we don't add a new column.
        if (itemModel.get('expanded')) {
          return;
        }

        // We first need to collapse all sibling *columns* to the right,
        // if any. Simply remove them.
        ArchibaldCurriculum.getColumnDatabase().remove(
          ArchibaldCurriculum.getColumnRightSiblings(column)
        );

        // It is possible some items were highlighted. Unhighlight them.
        unhighlight();

        // Get all expanded sibling *items* in the column (should only be one,
        // but we use a failsafe logic and treat it as an array) and update
        // their "expanded" property.
        var siblingExpandedItems = columnCollection.where({ expanded: true });
        for (var i in siblingExpandedItems) {
          siblingExpandedItems[i].set('expanded', false);
        }

        // Get the item that was clicked and set its "expanded" property to
        // true.
        itemModel.set('expanded', true);

        // Create the new column, collapsed by default.
        var newColumn = ArchibaldCurriculum.createColumn(itemDatabase.where({ parentId: itemModel.get('id') }), true, true);

        // Make sure none of its children are "expanded".
        var expandedItems = itemDatabase.where({ parentId: itemModel.get('id'), expanded: true });
        for (var i in expandedItems) {
          expandedItems[i].set('expanded', false);
        }

        // Bind to the item:select and item:change events.
        newColumn.on('item:select', addColumn);
        newColumn.on('item:select', updateItemInfo);
        newColumn.on('item:change', updateHierarchy);
        newColumn.on('column:go-back', goBack);
        newColumn.on('column:go-to-root', goToRoot);

        // If there are more than maxCols columns visible, hide the
        // first ones. Expand the others, as a failsafe.
        var leftSiblings = ArchibaldCurriculum.getColumnLeftSiblings(newColumn),
            leftSiblingsCount = leftSiblings.length;
        if (leftSiblingsCount >= maxCols) {
          _.each(leftSiblings, function(element, i) {
            var column = element.get('column');
            if (leftSiblingsCount - i >= maxCols) {
              column.collapse();
            }
            else {
              column.expand();
            }
          });
        }

        // Show the new column.
        newColumn.expand();
      };

      // Re-usable function for updating the item information.
      var updateItemInfo = function(itemModel, columnCollection, column, e) {
        if (typeof updateItemInfo.view !== 'undefined') {
          updateItemInfo.view.remove();
        }
        if (typeof itemModel === 'undefined') {
          // @todo This must be done in clean way.
          $('#archibald-item-info-content').empty().html('<span class="archibald-item-info__content__empty">Select an item to see its information</span>');
        }
        else {
          updateItemInfo.view = new ArchibaldCurriculum.ItemInfoView({ model: itemModel });
          $('#archibald-item-info-content').empty().append(updateItemInfo.view.render().$el);
        }
      };

      // Re-usable function for handling "change" events.
      // This callback will handle the recursive checking or unchecking of
      // parents and children items, respectively, upon changing the state
      // of one item.
      var updateHierarchy = function(itemModel, columnCollection, column, e) {
        ArchibaldCurriculum.recursiveCheck(
          itemModel,
          true,
          "This will also uncheck all child items. Are you sure you want to continue?"
        );
      };

      // Re-usable function for handling "go back" events.
      // Whenever the "Back" button is clicked, we want to show the parent
      // column again.
      var goBack = function(columnCollection, column, e) {
        // It is possible some items were highlighted. Unhighlight them.
        unhighlight();

        // Remove the item info.
        updateItemInfo();

        // If there's a previous column, show it, and collapse the last one.
        var prev = _.last(ArchibaldCurriculum.getColumnLeftSiblings(column)),
            last = _.last(ArchibaldCurriculum.getColumnRightSiblings(column));

        if (prev) {
          prev.get('column').expand();
        }

        if (last) {
          ArchibaldCurriculum.getColumnDatabase().remove(last);
        }

        // Remove the expanded attribute on the new last column items.
        last = ArchibaldCurriculum.getColumnDatabase().last();
        var expandedItems = last.get('column').collection.where({ expanded: true });
        for (var i in expandedItems) {
          expandedItems[i].set('expanded', false);
        }
      };

      // Re-usable function for handling "go to root" events.
      // Whenever the "Top" button is clicked, we want to show only the
      // top-most parent column.
      var goToRoot = function(columnCollection, column, e) {
        // It is possible some items were highlighted or expanded. Remove
        // these attributes.
        unhighlight();
        unexpand();

        // Remove the item info.
        updateItemInfo();

        // Fetch the first column, and collapse all others.
        var firstColumn = ArchibaldCurriculum.getColumnDatabase().first();
        ArchibaldCurriculum.getColumnDatabase().remove(
          ArchibaldCurriculum.getColumnRightSiblings(firstColumn.get('column'))
        );

        // Make sure the first column is expanded.
        firstColumn.get('column').expand();
      };

      // Create the initial column.
      var column = ArchibaldCurriculum.createColumn(itemDatabase.where({ parentId: "root" }));
      column.on('item:select', addColumn);
      column.on('item:select', updateItemInfo);
      column.on('item:change', updateHierarchy);

      // Summary logic.
      // Set the summary DOM wrapper.
      ArchibaldCurriculum.setSummaryWrapper($('#archibald-summary-content'));
      var summary = ArchibaldCurriculum.getSummary();
      summary.on('summary:select-item', function(itemModel, collection, summaryView, e) {
        // First, fully collapse all the columns, except the "root" one. Get
        // the first column element from the database.
        var column = ArchibaldCurriculum.getColumnDatabase().first().get('column');

        // Expand it.
        column.expand();

        // Remove all other columns on the right.
        ArchibaldCurriculum.getColumnDatabase().remove(
          ArchibaldCurriculum.getColumnRightSiblings(column)
        );

        // Construct the hierarchy as an array.
        var items = [],
            item = itemModel;
        while (item.get('parentId') !== 'root') {
          items.push(item);
          item = collection.get(item.get('parentId'));
        }
        items.push(item);

        // Reverse it, and remove the last item (we don't expand the selected
        // item).
        items.reverse().pop();

        // Make sure none of the items in the database are "expanded" or
        // "highlighted".
        var expandedItems = ArchibaldCurriculum.getItemDatabase().where({ expanded: true });
        for (var i in expandedItems) {
          expandedItems[i].set('expanded', false);
        }

        // Now, loop through the selected item's hierarchy, and trigger the
        // "item:select" event, updating the column reference every time.
        for (var i in items) {
          column.trigger(
            'item:select',
            items[i],
            new ArchibaldCurriculum.ItemCollection(),
            column,
            {}
          );

          // Update the column reference, so we trigger it on the correct one
          // on the next pass.
          column = ArchibaldCurriculum.getColumnDatabase().last().get('column');
        }

        // Finally, highlight the selected item, and scroll to it, both in the
        // main window AND inside the column.
        itemModel.set('highlighted', true);
        // @todo Make this a method of the View itself!
        column.$el.find('.nano').nanoScroller({ scrollTo: $('#archibald-column__wrapper__list__item-' + itemModel.get('id')) });
        $('body, html').stop().animate({
          scrollTop: (ArchibaldCurriculum.getWrapper().offset().top - 50) + 'px'
        });
      });

      // Allow the summary to be collapsed.
      $('#archibald-summary-collapse').click(function() {
        $(this).toggleClass('icon-plus').toggleClass('icon-minus');
        $('#archibald-summary').toggleClass('archibald-summary--collapsed');
      });

      // Item info logic.
      // Add the scrollbar.
      $('#archibald-item-info').nanoScroller();

      // Allow the item info to be collapsed.
      $('#archibald-item-info-collapse').click(function() {
        $(this).find('i').toggleClass('icon-plus').toggleClass('icon-minus');
        $('#archibald-item-info').toggleClass('archibald-item-info--expanded');
        onResize();
      });


      // LP21 logic.
      // Allow the filtering of items based on cycle data.
      $('#archibald-lp21-filters').change(function(e) {
        $('#archibald-row')
          .removeClass('lp21-show-cycle-1')
          .removeClass('lp21-show-cycle-2')
          .removeClass('lp21-show-cycle-3');

        $('#archibald-lp21-filter-warning').toggleClass('hidden', !$('#archibald-lp21-filters input:not(:checked)').length);

        $('#archibald-lp21-filters input:checked').each(function() {
          $('#archibald-row').addClass('lp21-show-' + this.value);
        });
      });
    }
  });
};

window.appInit = appInit;

})(jQuery);
