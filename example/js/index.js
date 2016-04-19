(function($) {

// In case of noConflict mode.
Backbone.$ = $;

var appInit = function() {
  var variant = window.location.search.replace( "?", "" ) || 'lp21';
  $.ajax({
    url: 'json/' + variant + '_full.json',
    dataType: 'json',
    success: function( items ) {
      // First, create a large database of all items.
      var app = new ArchibaldCurriculum.Core( items );
      var itemDatabase = app.getItemDatabase();

      // Fetch the row and pass it to the application as the DOM wrapper.
      app.setWrapper($('#archibald-editor-content'));

      app.activateResponsiveLogic();

      // Re-usable function for disabling all highlights.
      // It is possible some items were highlighted. Whenever we click
      // somewhere, we want to remove all highlighting.
      var unhighlight = function() {
        var highlightedItems = app.getItemDatabase().where({ highlighted: true });
        for (var i in highlightedItems) {
          highlightedItems[i].set('highlighted', false);
        }
      };

      // Re-usable function for disabling all expands.
      var unexpand = function() {
        var expandedItems = app.getItemDatabase().where({ expanded: true });
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
        app.getColumnDatabase().remove(
          app.getColumnRightSiblings(column)
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
        var newColumn = app.createColumn(itemDatabase.where({ parentId: itemModel.get('id') }), true, true);

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

        // If there are more than app.maxCols columns visible, hide the
        // first ones. Expand the others, as a failsafe.
        var leftSiblings = app.getColumnLeftSiblings(newColumn),
            leftSiblingsCount = leftSiblings.length;
        if (leftSiblingsCount >= app.maxCols) {
          _.each(leftSiblings, function(element, i) {
            var column = element.get('column');
            if (leftSiblingsCount - i >= app.maxCols) {
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
        app.recursiveCheck(
          itemModel,
          $('#archibald-confirm-opt-out').is(':checked'),
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
        var prev = _.last(app.getColumnLeftSiblings(column)),
            last = _.last(app.getColumnRightSiblings(column));

        if (prev) {
          prev.get('column').expand();
        }

        if (last) {
          app.getColumnDatabase().remove(last);
        }

        // Remove the expanded attribute on the new last column items.
        last = app.getColumnDatabase().last();
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
        var firstColumn = app.getColumnDatabase().first();
        app.getColumnDatabase().remove(
          app.getColumnRightSiblings(firstColumn.get('column'))
        );

        // Make sure the first column is expanded.
        firstColumn.get('column').expand();
      };

      // Create the initial column.
      var column = app.createColumn(itemDatabase.where({ parentId: "root" }), true);
      column.on('item:select', addColumn);
      column.on('item:select', updateItemInfo);
      column.on('item:change', updateHierarchy);

      // Summary logic.
      // Set the summary DOM wrapper.
      app.setSummaryWrapper($('#archibald-summary-content'));
      var summary = app.getSummary();
      summary.on('summary:select-item', function(itemModel, collection, summaryView, e) {
        // First, fully collapse all the columns, except the "root" one. Get
        // the first column element from the database.
        var column = app.getColumnDatabase().first().get('column');

        // Expand it.
        column.expand();

        // Remove all other columns on the right.
        app.getColumnDatabase().remove(
          app.getColumnRightSiblings(column)
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
        var expandedItems = app.getItemDatabase().where({ expanded: true });
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
          column = app.getColumnDatabase().last().get('column');
        }

        // Finally, highlight the selected item, and scroll to it, both in the
        // main window AND inside the column.
        itemModel.set('highlighted', true);
        // @todo Make this a method of the View itself!
        column.$el.find('.nano').nanoScroller({ scrollTo: $('#archibald-column__wrapper__list__item-' + itemModel.get('id')) });
        $('body, html').stop().animate({
          scrollTop: (app.getWrapper().offset().top - 50) + 'px'
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

        // Pass the new width to the resize function. This will allow us to
        // still have CSS transitions, without relying on complex JS events,
        // which are hard to control and could slow down the application.
        // WARNING: this width is hard coded!! See CSS file!!
        // We use the total expanded width minus the collapsed width, which
        // gives us the difference in width for the wrapper.
        var itemInfoWidth = 270; // 300 - 30;
        if ($('#archibald-item-info').hasClass('archibald-item-info--expanded')) {
          app.resize(app.getWrapper().width() - itemInfoWidth);
        }
        else {
          app.resize(app.getWrapper().width() + itemInfoWidth);
        }
      });

      // Opt out of confirm dialog logic.
      // Careful, cookies don't like Booleans... and jQuery.cookie() has a
      // really hard time returning data that can be cast to a boolean. Use
      // integer casting and strict comparison instead.
      $('#archibald-confirm-opt-out').change(function() {
        $.cookie('archibald_confirm_opt_out', $(this).is(':checked') ? 0 : 1, { expires: 7, path: '/' });
      }).attr('checked', parseInt($.cookie('archibald_confirm_opt_out')) === 0);

      // Full screen logic.
      if (
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
      ) {
        $('#archibald-curriculum-display').addClass('has-fullscreen');

        // @todo this is fragile. Probably better to use some other mechanic.
        var originalWidth = app.getWrapper().width();

        var isFullScreen = function() {
          return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
        };

        var fullScreenHandler = function() {
          if (isFullScreen()) {
            // @todo this is not very clean, with the toggleClass() inside
            // the click handler as well...
            $('#archibald-full-screen').find('i[class^="icon"]')
              .removeClass('icon-fullscreen')
              .addClass('icon-not-fullscreen');
            app.resize();
          }
          else {
            // @todo this is not very clean, with the toggleClass() inside
            // the click handler as well...
            $('#archibald-full-screen').find('i[class^="icon"]')
              .addClass('icon-fullscreen')
              .removeClass('icon-not-fullscreen');
            app.resize(originalWidth);
          }
        };

        var goFullScreen = function(element) {
          if (element.requestFullscreen) {
            element.requestFullscreen();
          }
          else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
          }
          else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
          }
          else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
          }
        };

        var cancelFullScreen = function(element) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
          else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
          else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          }
          else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        };

        document.addEventListener('fullscreenchange', fullScreenHandler, false);
        document.addEventListener('webkitfullscreenchange', fullScreenHandler, false);
        document.addEventListener('mozfullscreenchange', fullScreenHandler, false);
        document.addEventListener('MSFullscreenChange', fullScreenHandler, false);

        $('#archibald-full-screen').click(function() {
          var mustGoFullScreen = $(this).find('i[class^="icon"]')
                                    .toggleClass('icon-fullscreen')
                                    .toggleClass('icon-not-fullscreen')
                                    .hasClass('icon-not-fullscreen');

          var element = $('#archibald-curriculum-display')[0];

          if (mustGoFullScreen) {
            goFullScreen(element);
          }
          else {
            cancelFullScreen(element);
          }
        });
      }

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
