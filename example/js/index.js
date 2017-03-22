(function($) {

var appInit = function() {
  $.ajax({
    url: 'json/full.json',
    dataType: 'json',
    success: function( items ) {
      // We don't pass in the wrapper, otherwise we cannot react to the
      // app:render event.
      var app = new CurriculaUI.Core(items);

      // Bind our event listener, so we can add some custom markup on render.
      app.on( 'app:render', function() {
        app.getWrapper().prepend('\
        <div class="opts">\
          <div class="confirm-opt-out">\
            <label><input type="checkbox" id="confirm-opt-out" checked> Ask for confirmation when unchecking items</label>\
          </div>\
          <div class="full-screen" id="full-screen">\
            <i class="icon-fullscreen"></i> Full screen\
          </div>\
          <div class="search" id="search">\
            <i class="icon-search"></i> Search\
          </div>\
        </div>\
        ');
      });

      // Setting the wrapper will trigger the rendering.
      app.setWrapper($('#app'));

      // Create the initial column.
      app.createRootColumn(true);

      // Activate the responsive logic.
      app.activateResponsiveLogic();


      // Custom logic.
      // Opt out of confirm dialog logic.
      $('#confirm-opt-out').change(function() {
        // Update the settings. Don't use setSettings() again, as we don't need
        // everything to be re-computed. We just want to update the prompt
        // option.
        app.settings.recursiveCheckPrompt = $('#confirm-opt-out').is(':checked');

        // Set a cookie to remember the selection.
        // Careful, cookies don't like Booleans... and jQuery.cookie() has a
        // really hard time returning data that can be cast to a boolean. Use
        // integer casting and strict comparison instead.
        $.cookie('curricula_ui_confirm_opt_out', $('#confirm-opt-out').is(':checked') ? 0 : 1, { expires: 7, path: '/' });
      }).attr('checked', parseInt($.cookie('curricula_ui_confirm_opt_out')) === 0).change();

      // Allow the summary to be collapsed.
      app.getWrapper().find('.curricula-ui__summary-wrapper__label').click(function() {
        app.getWrapper().find('.curricula-ui__summary-wrapper').toggleClass('curricula-ui__summary-wrapper--collapsed');
      });

      // Show search.
      $( '#search' ).click( function() {
        app.showSearch( true );
      } );

      // Full screen logic.
      if (
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
      ) {
        $('html').addClass('has-fullscreen');

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
            $('#full-screen').find('i[class^="icon"]')
              .removeClass('icon-fullscreen')
              .addClass('icon-not-fullscreen');
            app.resize();
          }
          else {
            // @todo this is not very clean, with the toggleClass() inside
            // the click handler as well...
            $('#full-screen').find('i[class^="icon"]')
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

        $('#full-screen').click(function() {
          var mustGoFullScreen = $(this).find('i[class^="icon"]')
                                    .toggleClass('icon-fullscreen')
                                    .toggleClass('icon-not-fullscreen')
                                    .hasClass('icon-not-fullscreen');

          var element = $('#app')[0];

          if (mustGoFullScreen) {
            goFullScreen(element);
          }
          else {
            cancelFullScreen(element);
          }
        });
      }
    }
  });
};

window.appInit = appInit;

})(jQuery);
