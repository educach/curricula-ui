( function( $, Archibald ) {

Archibald.templates = Archibald.templates || {};

// We want to alter the display of certain items.
Archibald.templates.item = '\
<% if ( editable && ( typeof data === "undefined" || typeof data.is_selectable === "undefined" || data.is_selectable )) { %>\
  <input type="checkbox"<% if ( active ) { %> checked<% } %>/>\
<% } %>\
<% for ( var i in name ) { %>\
  <%= name[ i ] %>\
  <% if ( i < name.length - 1 ) {%><hr /><% } %>\
<% } %>\
<% if ( hasChildren ) { %>\
  <i class="icon-chevron-right" />\
<% } %>\
';

var appInit = function() {
  $.ajax({
    url: 'json/per_example.json',
    dataType: 'json',
    success: function( items ) {
      // We don't pass in the wrapper, otherwise we cannot react to the
      // app:render event.
      var app = new Archibald.Core( items );

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
        </div>\
        ');
      });

      app.on( 'column:item:render', function( itemModel, itemView, columnCollection, column, eventApp ) {
        if (
          typeof itemModel.get( 'data' ) !== 'undefined' &&
          typeof itemModel.get( 'data' ).level !== 'undefined'
        ) {
          itemView.$el.addClass( itemView.className + '--level-' + itemModel.get( 'data' ).level );
        }

        if ( itemModel.get( 'type' ) === 'title' ) {
          itemView.$el.append( '\
<div class="archibald-column__wrapper__list__item__per-selection">\
  <a>Sélectionner progressions d\'apprentissage&hellip;</a>\
</div>\
' );
        }
      });

      app.on( 'column:item:select', function( itemModel, itemView, columnCollection, column, eventApp ) {
        if ( itemModel.get( 'type' ) === 'objective' ) {

          if (
            typeof itemModel.get( 'data' ) !== 'undefined' &&
            typeof itemModel.get( 'data' ).per_table !== 'undefined'
          ) {
            var $window = $( window ),
                $table = $( '<table class="archibald-per-table"></table>' ),
                perTable = itemModel.get( 'data' ).per_table,
                $row, $cell, cellContent;

            for ( var rowId in perTable ) {
              $row = $( '<tr></tr>' );
              for ( var cellId in perTable[ rowId ] ) {
                $cell = $( '<td class="archibald-per-table__cell"></td>' );
                $cell.addClass( 'archibald-per-table__cell--' + perTable[ rowId ][ cellId ].type );

                if ( typeof perTable[ rowId ][ cellId ].level !== 'undefined' ) {
                  $cell.addClass( 'archibald-per-table__cell--level-' + perTable[ rowId ][ cellId ].level );
                }

                $cell.attr({
                  colspan: typeof perTable[ rowId ][ cellId ].colspan !== 'undefined' ?
                    perTable[ rowId ][ cellId ].colspan :
                    1,
                  rowspan: typeof perTable[ rowId ][ cellId ].rowspan !== 'undefined' ?
                    perTable[ rowId ][ cellId ].rowspan :
                    1,
                  'data-school-years': typeof perTable[ rowId ][ cellId ].school_years !== 'undefined' ?
                    perTable[ rowId ][ cellId ].school_years :
                    '',
                });

                cellContent = '';
                _.each( perTable[ rowId ][ cellId ].content, function( item ) {
                  cellContent += '<div class="archibald-per-table__cell__item">';

                  if ( perTable[ rowId ][ cellId ].is_selectable ) {
                    cellContent += '<label><input name="progressions-' + item.id + '" type="checkbox" /> ';
                    cellContent += item.value;
                    cellContent += '</label>';
                  } else {
                    cellContent += item.value;
                  }
                  cellContent += '</div>';
                } );
                $cell.html( cellContent );

                if ( perTable[ rowId ][ cellId ].is_selectable ) {
                  // As long as one item is selected, highlight the whole cell.
                  (function( $cell ) {
                    $cell.find( 'input' ).change( function() {
                      if ( $cell.find( 'input:checked' ).length ) {
                        $cell.addClass( 'archibald-per-table__cell--active' );
                      } else {
                        $cell.removeClass( 'archibald-per-table__cell--active' );
                      }
                    });
                  })( $cell );
                }

                $row.append( $cell );
              }
              $table.append( $row );
            }

            $( '#modal' ).html( $table ).dialog({
              height: $window.height() - 100,
              width: $window.width() - 400,
              buttons: [{
                text: "OK",
                click: function() {
                  $( this ).dialog( 'close' );
                }
              }]
            });
          }
        }
      });

      // Setting the wrapper will trigger the rendering.
      app.setWrapper( $( '#app' ) );

      // Create the initial column.
      app.createRootColumn( true );

      // Activate the responsive logic.
      app.activateResponsiveLogic();


      // Custom logic.
      // Opt out of confirm dialog logic.
      $( '#confirm-opt-out' ).change( function() {
        // Update the settings. Don't use setSettings() again, as we don't need
        // everything to be re-computed. We just want to update the prompt
        // option.
        app.settings.recursiveCheckPrompt = $( '#confirm-opt-out' ).is( ':checked' );

        // Set a cookie to remember the selection.
        // Careful, cookies don't like Booleans... and jQuery.cookie() has a
        // really hard time returning data that can be cast to a boolean. Use
        // integer casting and strict comparison instead.
        $.cookie( 'archibald_confirm_opt_out', $( '#confirm-opt-out' ).is( ':checked' ) ? 0 : 1, { expires: 7, path: '/' });
      } ).attr( 'checked', parseInt( $.cookie( 'archibald_confirm_opt_out' ) ) === 0 ).change();

      // Allow the summary to be collapsed.
      app.getWrapper().find( '.archibald-curriculum-ui__summary-wrapper__label' ).click( function() {
        app.getWrapper().find( '.archibald-curriculum-ui__summary-wrapper' ).toggleClass( 'archibald-curriculum-ui__summary-wrapper--collapsed' );
      } );

      // Full screen logic.
      if (
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
      ) {
        $( 'html' ).addClass( 'has-fullscreen' );

        // @todo this is fragile. Probably better to use some other mechanic.
        var originalWidth = app.getWrapper().width();

        var isFullScreen = function() {
          return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
        };

        var fullScreenHandler = function() {
          if ( isFullScreen() ) {
            // @todo this is not very clean, with the toggleClass() inside
            // the click handler as well...
            $( '#full-screen' ).find( 'i[class^="icon"]' )
              .removeClass( 'icon-fullscreen' )
              .addClass( 'icon-not-fullscreen' );
            app.resize();
          }
          else {
            // @todo this is not very clean, with the toggleClass() inside
            // the click handler as well...
            $( '#full-screen' ).find( 'i[class^="icon"]' )
              .addClass( 'icon-fullscreen' )
              .removeClass( 'icon-not-fullscreen' );
            app.resize( originalWidth );
          }
        };

        var goFullScreen = function( element ) {
          if ( element.requestFullscreen ) {
            element.requestFullscreen();
          }
          else if ( element.webkitRequestFullscreen ) {
            element.webkitRequestFullscreen();
          }
          else if ( element.mozRequestFullScreen ) {
            element.mozRequestFullScreen();
          }
          else if ( element.msRequestFullscreen ) {
            element.msRequestFullscreen();
          }
        };

        var cancelFullScreen = function( element ) {
          if ( document.exitFullscreen ) {
            document.exitFullscreen();
          }
          else if ( document.webkitExitFullscreen ) {
            document.webkitExitFullscreen();
          }
          else if ( document.mozCancelFullScreen ) {
            document.mozCancelFullScreen();
          }
          else if ( document.msExitFullscreen ) {
            document.msExitFullscreen();
          }
        };

        document.addEventListener( 'fullscreenchange' , fullScreenHandler, false );
        document.addEventListener( 'webkitfullscreenchange' , fullScreenHandler, false );
        document.addEventListener( 'mozfullscreenchange' , fullScreenHandler, false );
        document.addEventListener( 'MSFullscreenChange' , fullScreenHandler, false );

        $( '#full-screen' ).click(function() {
          var mustGoFullScreen = $( this ).find( 'i[class^="icon"]' )
                                    .toggleClass( 'icon-fullscreen' )
                                    .toggleClass( 'icon-not-fullscreen' )
                                    .hasClass( 'icon-not-fullscreen' );

          var element = $( '#app' )[ 0 ];

          if ( mustGoFullScreen ) {
            goFullScreen( element );
          }
          else {
            cancelFullScreen( element );
          }
        });
      }
    }
  });
};

window.appInit = appInit;

})( jQuery, window.ArchibaldCurriculum || ( window.ArchibaldCurriculum = new Object() ) );