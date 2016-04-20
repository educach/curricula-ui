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
      var app = new ArchibaldCurriculum.Core(items, $('#app'), {
        recursiveCheckPrompt: $('#archibald-confirm-opt-out').is(':checked')
      });

      var itemDatabase = app.getItemDatabase();
      app.activateResponsiveLogic();

      // Re-usable function for handling "go back" events.
      // Whenever the "Back" button is clicked, we want to show the parent
      // column again.
      var goBack = function(columnCollection, column, e) {
        // It is possible some items were highlighted. Unhighlight them.
        app.unhighlightItems();

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
        app.unhighlightItems();
        app.resetExpandedItems();

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
      // $('#archibald-item-info').nanoScroller();


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
