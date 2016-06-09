( function( $, Archibald ) {

Archibald.templates = Archibald.templates || {};

// We want to alter the display of certain items.
Archibald.templates.item = '\
<% if ( editable && ( typeof data === "undefined" || typeof data.isSelectable === "undefined" || data.isSelectable )) { %>\
  <input type="checkbox" value="model-<%= id %>"<% if ( active ) { %> checked<% } %>/>\
<% } %>\
<% for ( var i in name ) { %>\
  <%= name[ i ] %>\
  <% if ( i < name.length - 1 ) {%><hr /><% } %>\
<% } %>\
<% if ( hasChildren ) { %>\
  <i class="icon-chevron-right" />\
<% } %>\
';

Archibald.templates.summaryList = '\
<li\
  data-model-id="<%= id %>"\
  class="\
  archibald-curriculum-ui-summary__list__item\
  archibald-curriculum-ui-summary__list__item--<%= type %>\
  <% if ( typeof data !== "undefined" && typeof data.isGroup !== "undefined" && data.isGroup ) { %>archibald-curriculum-ui-summary__list__item--isGroup<%  } %>\
  "\
>\
  <span>\
    <% for ( var i in name ) { %>\
      <%= name[ i ] %>\
      <% if ( i < name.length - 1 ) {%><hr /><% } %>\
    <% } %>\
  </span>\
  <%= children %>\
</li>\
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
          <div class="search" id="search">\
            <i class="icon-search"></i> Search\
          </div>\
        </div>\
        ');

        app.getWrapper().find( '.archibald-curriculum-ui__editor' ).after('\
        <div class="select-school-years" id="select-school-years">\
          <h4>Sélectionner des années scolaires:</h4>\
          <label><input class="select-school-years__input" type="checkbox" value="1-2" />1<sup>re</sup> &ndash; 2<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="3-4" />3<sup>e</sup> &ndash; 4<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="5-6" />5<sup>e</sup> &ndash; 6<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="7-8" />7<sup>e</sup> &ndash; 8<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="9" />9<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="10" />10<sup>e</sup></label>\
          <label><input class="select-school-years__input" type="checkbox" value="11" />11<sup>e</sup></label>\
          <div id="select-school-years-message" class="select-school-years--message"></div>\
        </div>\
        ');

        $( '#select-school-years input' ).click(function() {
          $( this ).toggleClass( 'select-school-years__input--hand-selected' );
        });
      });

      // Set settings, and hijack some.
      app.setSettings();
      var oldItemSelectEventHandler = app.settings.events[ "item:select" ];
      app.settings.events[ "item:select" ] = function( item, columnCollection, column ) {
        // We hijack this event. If the item is an objective, we don't trigger
        // the core event handler.
        if ( item.get( 'type' ) !== 'objective' ) {
          oldItemSelectEventHandler( item, columnCollection, column );
        }
      };

      // When an objective is rendered, remove the has-children modifier class.
      app.on( 'column:item:render', function( itemModel, itemView, columnCollection, columnView ) {
        if ( itemModel.get( 'type' ) === 'objective' ) {
          itemView.$el.removeClass( itemView.className + '--has-children' );
        }
      } );

      var checkSchoolYears = function( schoolYears ) {
        var selectedItems = app.getItemDatabase().where({
              active: true
            }),
            checkAndLock = [],
            $input;

        if ( typeof checkSchoolYears.tpl === 'undefined' ) {
          checkSchoolYears.tpl = _.template('\
            <% for ( var i in items ) { %>\
              <%= items[ i ] %><% if ( items.length > 1 && i < items.length-1 ) {\
                if ( i == items.length-2 ) { %> et <% } else { %>, <% }\
              } %>\
            <% } %>\
            <% if ( items.length > 1 ) { %>sont<% } else { %>est<% } %> verouillé<% if ( items.length > 1 ) { %>s<% } %>, car  <% if ( items.length > 1 ) { %>ils sont<% } else { %>il est<% } %> implicitement sélectionné<% if ( items.length > 1 ) { %>s<% } %> par rapport aux éléments actifs.\
          ');
        }

        // Reset the checkboxes and message first.
        $( '#select-school-years input' ).each(function() {
          var $this = $( this );
          $this.prop({
            checked: $this.hasClass('select-school-years__input--hand-selected'),
            disabled: false
          });
        });
        $( '#select-school-years-message' ).html( '' );

        // Now, check all active items. If one of them has the current school
        // years, check and lock.
        _.each( selectedItems, function( item ) {
          if (
            typeof item.get( 'data' ) !== 'undefined' &&
            typeof item.get( 'data' ).perSchoolYears !== 'undefined' &&
            item.get( 'type' ) !== 'objective'
          ) {
            checkAndLock = checkAndLock.concat( item.get( 'data' ).perSchoolYears );
          }
        } );

        checkAndLock = _.unique( checkAndLock );
        if ( checkAndLock.length ) {
          _.each( checkAndLock, function( item ) {
            $( '#select-school-years input[value="' + item + '"]' ).prop({
              checked: true,
              disabled: true
            });
          } );

          $( '#select-school-years-message' ).html( checkSchoolYears.tpl({
            items: checkAndLock
          }));
        }
      }

      var openModal = function( itemModel, itemView, columnCollection, column, eventApp ) {
        if ( itemModel.get( 'type' ) === 'objective' ) {
          if (
            typeof itemModel.get( 'data' ) !== 'undefined' &&
            typeof itemModel.get( 'data' ).perTable !== 'undefined'
          ) {
            var $window = $( window ),
                $wrapper = $( '<div class="archibald-per-modal"></div>' ),
                $table = $( '<table class="archibald-per-table"></table>' ),
                perTable = itemModel.get( 'data' ).perTable,
                $row, $cell, cellContent;

            $wrapper.append( $table );

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
                  'data-per-school-years': typeof perTable[ rowId ][ cellId ].perSchoolYears !== 'undefined' ?
                    perTable[ rowId ][ cellId ].perSchoolYears :
                    '',
                });

                cellContent = '';
                _.each( perTable[ rowId ][ cellId ].content, function( item ) {
                  cellContent += '<div class="archibald-per-table__cell__item">';

                  if ( perTable[ rowId ][ cellId ].isSelectable ) {
                    var model = app.getItemDatabase().get( item.id ),
                        checked = model ? model.get( 'active' ) : false;
                    cellContent += '<label><input value="model-' + item.id + '" type="checkbox" ' + ( checked ? ' checked="checked"' : '' ) + ' /> ';

                    cellContent += item.value;
                    cellContent += '</label>';
                  } else {
                    cellContent += item.value;
                  }
                  cellContent += '</div>';
                } );
                $cell.html( cellContent );

                if ( perTable[ rowId ][ cellId ].isSelectable ) {
                  (function( $cell ) {
                    $cell.find( 'input' ).change( function() {
                      // Upon checking an item, actually select the
                      // corresponding model.
                      var $this = $( this );
                      if ( $this.val() ) {
                        var model = app.getItemDatabase().get( $this.val().replace( 'model-', '' ) );
                        model.set( 'active', $this.is( ':checked' ) );
                        app.recursiveCheck( model, app.settings.recursiveCheckPrompt );
                      }

                      // As long as one item is selected, highlight the whole
                      // cell.
                      if ( $cell.find( 'input:checked' ).length ) {
                        $cell.addClass( 'archibald-per-table__cell--active' );
                      } else {
                        $cell.removeClass( 'archibald-per-table__cell--active' );
                      }
                    }).change();
                  })( $cell );
                }

                $row.append( $cell );
              }
              $table.append( $row );
            }

            $( '#modal' ).empty().html( $wrapper ).dialog({
              height: $window.height() - 100,
              width: $window.width() - 400,
              position: { my: 'center center-50px', at: 'center', of: app.getWrapper() },
              show: 100,
              buttons: [{
                text: "OK",
                click: function() {
                  $( this ).dialog( 'close' );
                }
              }]
            });
          }
        }
      };

      var dependencyCheck = function( item, prompt ) {
        prompt = !!prompt;

        // If there are no dependencies, simply ignore.
        if (
          typeof item.get( 'dependencies') === 'undefined' ||
          !item.get( 'dependencies').length
        ) {
          return;
        }

        var dependency;
        for ( var i = item.get( 'dependencies').length - 1; i >= 0; --i ) {
          dependency = app.getItemDatabase().get( item.get( 'dependencies')[ i ] );
          if ( dependency ) {
            // If our item is active, activate the dependency.
            if ( item.get( 'active' ) ) {
              dependency.set( 'active', true );
            } else {
              // Check if, for any our dependency, there are no longer any
              // dependents active. If so, we deactivate the dependency.
              var dependents = app.getItemDatabase().filter(function( model ) {
                return (
                  model.get( 'active' ) &&
                  typeof model.get( 'dependencies') !== 'undefined' &&
                  model.get( 'dependencies' ).indexOf( dependency.get( 'id' ) ) !== -1
                );
              });

              if ( !dependents.length ) {
                // No more active dependents. Deactivate.
                dependency.set( 'active', false );
              }
            }

            // This is recursive.
            dependencyCheck( dependency );
          }
        }
      };

      app.on( 'column:item:render', function( itemModel, itemView, columnCollection, column, eventApp ) {
        if (
          typeof itemModel.get( 'data' ) !== 'undefined' &&
          typeof itemModel.get( 'data' ).level !== 'undefined'
        ) {
          itemView.$el.addClass( itemView.className + '--level-' + itemModel.get( 'data' ).level );
        }

        if ( itemModel.get( 'type' ) === 'objective' ) {
          itemView.$el.append( '\
<div class="archibald-column__wrapper__list__item__per-selection">\
  <a>Sélectionner progressions d\'apprentissage&hellip;</a>\
</div>\
' );
          itemView.$el.find( '.archibald-column__wrapper__list__item__per-selection a' ).click(function( e ) {
            e.stopPropagation();
            openModal( itemModel, itemView, columnCollection, column, eventApp );
          });
        }
      });

      app.getItemDatabase().on( 'change:active', function( itemModel ) {
        dependencyCheck( itemModel, true );
        if (
          typeof itemModel.get( 'data' ) !== 'undefined' &&
          typeof itemModel.get( 'data' ).perSchoolYears !== 'undefined' &&
          itemModel.get( 'type' ) !== 'objective'
        ) {
          checkSchoolYears();
        }
      } );

      app.on( 'column:item:change', function( itemModel, itemView, columnCollection, column, eventApp ) {
        if (
          typeof itemModel.get( 'data' ) !== 'undefined' &&
          typeof itemModel.get( 'data' ).isSelectable !== 'undefined' &&
          !itemModel.get( 'data' ).isSelectable &&
          itemModel.get( 'active' )
        ) {
          itemModel.set( 'active', false );
        }
      } );

      // If the selected item is a "progression d'apprentissage", core will
      // not scroll to it. Trigger that logic ourselves.
      app.on( 'summary:item:select search:select', function( selectedItem, collection, view ) {
        if ( selectedItem.get( 'type' ) === 'progression' ) {
          var timeOut = 100;

          // @todo Make this a method of the View itself!
          if ( typeof $.fn.nanoScroller !== 'undefined' ) {
            var $element = app.getWrapper().find( '[data-model-id="' + selectedItem.get( 'parentId' ) + '"]' );
            if ( $element.length ) {
              // @todo Too much hardcoded stuff!!
              $element.parents( '.archibald-column' ).find( '.nano' ).nanoScroller({
                scrollTo: $element
              });

              setTimeout( function() {
                $element.find( '.archibald-column__wrapper__list__item__per-selection a' ).click();
              }, 400 );
              timeOut = 600;
            }
          }

          // Scroll the dialog as well. Give the dialog some time to open up and
          // render.
          setTimeout( function() {
            $( '#modal' ).stop().animate({
              scrollTop: ( $( '#modal' ).find( '[value="model-' + selectedItem.get( 'id' ) + '"]' ).offset().top - 100 ) + 'px'
            });
          }, timeOut );
        }
      } );

      app.on( 'search:results', function( results, collection ) {
        // Many objectives have the same name. Add cycle information so we can
        // distinguish them, unless the element has an objective code.
        var item;
        for ( var i = results.length - 1; i >= 0; --i ) {
          item = collection.get( results[ i ].value );
          if (
            item &&
            typeof item.get( 'data' ) !== 'undefined' &&
            typeof item.get( 'data' ).perCode === 'undefined' &&
            typeof item.get( 'data' ).cycle !== 'undefined'
           ) {
            results[ i ].label += ' (cycle ' + item.get( 'data' ).cycle + ')';
          }
        }
      } );

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
