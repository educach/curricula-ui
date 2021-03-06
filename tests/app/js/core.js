QUnit.module( "Core" );


/**
 * Test the constructor logic.
 */
QUnit.test( "constructor", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper );

  assert.ok( !!app.getItemDatabase(), "The item database is correctly set." );
  assert.ok( app.getWrapper().length, "The wrapper is correctly set." );
  assert.notEqual( '', $wrapper[ 0 ].id, "The wrapper received an ID." );

  // Re-assigning the wrapper will empty it, and re-initialize it entirely.
  $wrapper.append( '<span id="_delete-me_"></span>' );
  assert.equal( 1, $wrapper.find( '#_delete-me_' ).length );
  app.setWrapper( $wrapper );
  assert.equal( 0, $wrapper.find( '#_delete-me_' ).length, "The wrapper was emptied and re-initialized." );

  // Calling setWrapper() again, without passing a DOM element, will simply
  // re-assign the existing wrapper, but still empty and re-initialize it.
  $wrapper.append( '<span id="_delete-me_"></span>' );
  assert.equal( 1, $wrapper.find( '#_delete-me_' ).length );
  app.setWrapper();
  assert.equal( 0, $wrapper.find( '#_delete-me_' ).length, "The wrapper was re-used, emptied and re-initialized." );
});

/**
 * Test the settings extension logic.
 */
QUnit.test( "settings extension", function( assert ) {
  var app = new CurriculaUI.Core( _testGetJSONItems(), $( '#qunit-fixture' ), {
    dummySetting: true,
    itemView: { fake: true }
  } );

  assert.ok(
    app.getSettings().dummySetting,
    "Unknown settings are correctly set."
  );
  assert.deepEqual(
    { fake: true },
    app.getSettings().itemView,
    "The settings are correctly set and extended."
  );
  assert.deepEqual(
    CurriculaUI.ItemListView,
    app.getSettings().itemListView,
    "The default settings are correctly kept."
  );
});

/**
 * Test the column collection event binding.
 */
QUnit.test( "column collection events", function( assert ) {
  var app = new CurriculaUI.Core( _testGetJSONItems() ),
      columns = app.getColumnDatabase(),
      $dummy = $( '<div>Column</div>' ).appendTo( '#qunit-fixture' ),
      model = new CurriculaUI.ColumnModel({ column: $dummy });

  // Add the column, and then remove it again. This should trigger the remove
  // event, which should remove the $dummy element from the DOM.
  assert.ok(
    document.contains( $dummy[ 0 ] ),
    "The column was correctly added to the DOM."
  );
  columns.add( model );
  columns.remove( model );
  assert.notOk(
    document.contains( $dummy[ 0 ] ),
    "The column was correctly removed from the DOM."
  );
});

/**
 * Test the column creation helper.
 */
QUnit.test( "column creation helper", function( assert ) {
  var doneBubbleEvent = assert.async(),
      app = new CurriculaUI.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column = app.createRootColumn();

  assert.throws(
    function() {
      app.createRootColumn();
    },
    "Trying to create a root column when columns already exist throws an error."
  );

  // Check the defaults.
  assert.notOk( column.isCollapsed(), "The column is not collapsed by default." );
  assert.notOk( column.settings.editable, "The column is not editable by default." );
  // Check the column was added to the DOM.
  assert.ok(
    document.contains( column.$el[ 0 ] ),
    "The column was correctly added to the DOM."
  );
  // Check it was added to the column database.
  assert.ok(
    !!app.getColumnDatabase().where({ column: column }).length,
    "The column was correctly added to the database."
  );

  // Check passing params.
  column = app.createColumn( _testGetJSONItems()[ 'root' ], true, true );
  assert.ok( column.isCollapsed(), "The column is collapsed." );
  assert.ok( column.settings.editable, "The column is editable." );

  // Check that all events on the column are correctly bubbled up.
  app.on( 'column:item:select', function( item, columnCollection, eventColumn, eventApp ) {
    assert.equal(
      column,
      eventColumn,
      "The passed arguments are correctly proxied from the original event."
    );
    assert.equal(
      app,
      eventApp,
      "The application is correctly passed to the event."
    );
    doneBubbleEvent();
  } );
  column.childViews[ 0 ].triggerSelect();
});

/**
 * Test the column left/right selection helpers.
 */
QUnit.test( "column left/right selection helpers", function( assert ) {
  var app = new CurriculaUI.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column1 = app.createColumn( _testGetJSONItems()[ 'root' ] ),
      column2 = app.createColumn( _testGetJSONItems()[ 'root' ] ),
      column3 = app.createColumn( _testGetJSONItems()[ 'root' ] ),
      column4 = app.createColumn( _testGetJSONItems()[ 'root' ] ),
      column5 = app.createColumn( _testGetJSONItems()[ 'root' ] ),
      mapCallback = function( item ) {
        return item.get( 'column' );
      };

  assert.deepEqual(
    [],
    _.map( app.getColumnLeftSiblings( column1 ), mapCallback ),
    "Correctly found all columns on the left of column1."
  );
  assert.deepEqual(
    [ column1, column2 ],
    _.map( app.getColumnLeftSiblings( column3 ), mapCallback ),
    "Correctly found all columns on the left of column3."
  );
  assert.deepEqual(
    [ column4, column5 ],
    _.map( app.getColumnRightSiblings( column3 ), mapCallback ),
    "Correctly found all columns on the right of column3."
  );
  assert.deepEqual(
    [],
    _.map( app.getColumnRightSiblings( column5 ), mapCallback ),
    "Correctly found all columns on the right of column5."
  );
});

/**
 * Test the recursive (un)checking logic.
 */
QUnit.test( "recursive (un)checking logic", function( assert ) {
  // Store the original confirm function. We will replace it with a new one.
  var realConfirm = window.confirm;

  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      doneConfirmEvent = assert.async( 2 ),
      doneChangeActiveEvent = assert.async( 3 ),
      done = assert.async(),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      chain = [ 'id-6', 'id-5', 'id-1' ],
      column = app.createRootColumn( true ),
      database = app.getItemDatabase();

  // Check the event is correctly triggered.
  app.on( 'items:change:active', function( changedItems, allItems, eventApp ) {
    doneChangeActiveEvent();
    for ( var i = 0; i < chain.length; i++ ) {
      assert.ok(
        !!changedItems.get( chain[ i ] ),
        "Passed items for items:change:active event contains item " + chain[ i ]
      );
    }
  } );

  // Checking item with the id-6 will also check items id-5 and id-1.
  var item6 = database.get( 'id-6' );
  item6.set( 'active', true );
  app.recursiveCheck( item6 );
  for ( var i = 0; i < chain.length; i++ ) {
    assert.ok(
      database.get( chain[ i ] ).get( 'active' ),
      "Correctly checked item " + chain[ i ]
    );
  }

  // Allow the rendering to take place.
  setTimeout( function() {
    // Unchecking item id-1 will also uncheck items id-5 and id-6. Try this with
    // an actual click event.
    var $item1 = $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' );
    assert.ok( $item1.find( 'input' ).is( ':checked' ), "Item id-1 was correctly rendered with a checked checkbox." );
    $item1.find( 'input' ).click();
    assert.notOk( $item1.find( 'input' ).is( ':checked' ), "Item id-1's checkbox was correctly unchecked." );
    for ( var j = 0; j < chain.length; j++ ) {
      assert.notOk(
        database.get( chain[ j ] ).get( 'active' ),
        "Correctly unchecked item " + chain[ j ]
      );
    }

    // Try recursively unchecking, and prompting the user for confirmation. First
    // test if the user confirms (return true).
    window.confirm = function( message ) {
      doneConfirmEvent();
      return true;
    }
    // Check all items in the chain.
    for ( var i = 0; i < chain.length; i++ ) {
      database.get( chain[ i ] ).set( 'active', true );
    }
    // Uncheck item 1, and recursively uncheck its children. Confirm when
    // prompted.
    var item1 = database.get( 'id-1' );
    item1.set( 'active', false );
    app.recursiveCheck( item1, true );
    for ( var j = 0; j < chain.length; j++ ) {
      assert.notOk(
        database.get( chain[ j ] ).get( 'active' ),
        "Correctly unchecked item " + chain[ j ]  + " when asked for confirmation."
      );
    }

    // Check all items in the chain again.
    for ( var i = 0; i < chain.length; i++ ) {
      database.get( chain[ i ] ).set( 'active', true );
    }
    // This time cancel when prompted.
    window.confirm = function( message ) {
      doneConfirmEvent();
      return false;
    }
    // Uncheck item 1, and recursively uncheck its children. Cancel when
    // prompted.
    item1.set( 'active', false );
    app.recursiveCheck( item1, true );
    for ( var j = 0; j < chain.length; j++ ) {
      assert.ok(
        database.get( chain[ j ] ).get( 'active' ),
        "Correctly left item " + chain[ j ]  + " checked when asked for confirmation."
      );
    }

    // Restore the confirm function.
    window.confirm = realConfirm;
    done();
  }, 100 );
});

/**
 * Test the responsive logic helpers.
 */
QUnit.test( "responsive logic helpers", function( assert ) {
  var done = assert.async();

  var app = new CurriculaUI.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column, model, i;

  // Activate the responsive logic. In order to have full control over our test
  // environment, we do this before we add any columns.
  app.activateResponsiveLogic();

  // Because the responsive activation will trigger a resize in 100ms, we wait
  // for it to finish, and then trigger our test code.
  setTimeout( function() {
    // Create 5 dummy columns, all expanded.
    for ( i = 5; i > 0; --i ) {
      column = app.createColumn( _testGetJSONItems()[ 'root' ] );
      column.expand();
    }
    // Make the application think we are showing all 5.
    app.maxCols = 5;

    // Trigger a resize. A width of 900 should allow for 3 columns.
    app.resize( 900 );
    assert.equal( 3, app.maxCols, "A width of 900 allows the application to show 3 columns." );

    // Check the columns. Only the last 3 should still be expanded.
    for ( i in { 0: 0, 1: 1 } ) {
      assert.ok(
        app.getColumnDatabase().at( i ).get( 'column' ).isCollapsed(),
        "Column " + i + " is correctly collapsed."
      );
    }
    for ( i in { 2: 2, 3: 3, 4: 4 } ) {
      assert.ok(
        app.getColumnDatabase().at( i ).get( 'column' ).isExpanded(),
        "Column " + i + " is correctly expanded."
      );
    }

    // Now do the inverse. Resize to 1200, which should show 1 more column.
    app.resize( 1200 );
    assert.equal( 4, app.maxCols, "A width of 1200 allows the application to show 4 columns." );

    // Check the columns. Only the 1st one should be collapsed.
    assert.ok(
      app.getColumnDatabase().at( 0 ).get( 'column' ).isCollapsed(),
      "Column 0 is correctly collapsed."
    );
    for ( i in { 1: 1, 2: 2, 3: 3, 4: 4 } ) {
      assert.ok(
        app.getColumnDatabase().at( i ).get( 'column' ).isExpanded(),
        "Column " + i + " is correctly expanded."
      );
    }

    // Clean up.
    app.$style.remove();
    $( 'iframe.__curricula-ui__curricula-ui--hacky-scrollbar-resize-listener__' ).remove();

    done();
  }, 200 );
});

/**
 * Test unhighlighting items.
 */
QUnit.test( "unhighlighting items", function( assert ) {
  var app = new CurriculaUI.Core( _testGetJSONItems() ),
      doneChangeHighlightedEvent = assert.async(),
      done = assert.async();

  // Check the event is correctly triggered.
  app.on( 'items:change:highlighted', function( changedItems, allItems, eventApp ) {
    doneChangeHighlightedEvent();
    assert.ok(
      !!changedItems.get( 'id-1' ),
      "Passed items for items:change:highlighted event contains item id-1"
    );
    assert.ok(
      !!changedItems.get( 'id-3' ),
      "Passed items for items:change:highlighted event contains item id-3"
    );
    assert.ok(
      !!changedItems.get( 'id-6' ),
      "Passed items for items:change:highlighted event contains item id-6"
    );
  } );

  // Highlight some items.
  app.getItemDatabase().get( 'id-1' ).set( 'highlighted', true );
  app.getItemDatabase().get( 'id-3' ).set( 'highlighted', true );
  app.getItemDatabase().get( 'id-6' ).set( 'highlighted', true );
  assert.ok(
    !!app.getItemDatabase().where({ highlighted: true }).length,
    "Some items were highlighted."
  );

  app.unhighlightItems();
  assert.notOk(
    !!app.getItemDatabase().where({ highlighted: true }).length,
    "All items were unhighlighted."
  );

  done();
});

/**
 * Test resetting expanded items.
 */
QUnit.test( "reset expanded items", function( assert ) {
  var app = new CurriculaUI.Core( _testGetJSONItems() ),
      doneChangeExpandedEvent = assert.async(),
      done = assert.async();

  // Check the event is correctly triggered.
  app.on( 'items:change:expanded', function( changedItems, allItems, eventApp ) {
    doneChangeExpandedEvent();
    assert.ok(
      !!changedItems.get( 'id-1' ),
      "Passed items for items:change:expanded event contains item id-1"
    );
    assert.ok(
      !!changedItems.get( 'id-3' ),
      "Passed items for items:change:expanded event contains item id-3"
    );
    assert.ok(
      !!changedItems.get( 'id-6' ),
      "Passed items for items:change:expanded event contains item id-6"
    );
  } );

  // Expand some items.
  app.getItemDatabase().get( 'id-1' ).set( 'expanded', true );
  app.getItemDatabase().get( 'id-3' ).set( 'expanded', true );
  app.getItemDatabase().get( 'id-6' ).set( 'expanded', true );
  assert.ok(
    !!app.getItemDatabase().where({ expanded: true }).length,
    "Some items were expanded."
  );

  app.resetExpandedItems();
  assert.notOk(
    !!app.getItemDatabase().where({ expanded: true }).length,
    "All expanded items were reset."
  );

  done();
});

/**
 * Test using the "Back" button.
 */
QUnit.test( "collapse columns when clicking the Back button", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      column = app.createRootColumn(),
      done = assert.async();

  // The Back button will only appear if there are more than maxCols columns
  // visible. The visibility is handled by opacity (because the DOM element
  // needs to be "present" for the layout to be displayed correctly).
  app.maxCols = 2;

  // Expand id-1 by clicking on it.
  $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' ).click();

  // Wait for the children to be rendered.
  setTimeout( function() {
    // Expand id-5 by clicking on it.
    $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-5"]' ).click();

    // Wait for the children to be rendered.
    setTimeout( function() {
      assert.equal(
        1,
        $wrapper.find( '.curricula-ui__column--collapsed' ).length,
        "There is 1 collapsed column (the 1st one)"
      );

      // A back button should now be visible. Clicking on it should collapse
      // the children of id-5.
      $wrapper
        .find( '.curricula-ui__column:eq(1)' )
        .find( '.curricula-ui__column__button--show-parent' )
        .click();

      // There should be no more collapsed columns.
      assert.equal(
        0,
        $wrapper.find( '.curricula-ui__column--collapsed' ).length,
        "There are no more collapsed columns"
      );

      done();
    }, 100 );
  }, 100 );
});

/**
 * Test using the "Top" button.
 */
QUnit.test( "collapse columns when clicking the Top button", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      column = app.createRootColumn(),
      done = assert.async();

  // The Top button will only appear if there are more than maxCols columns
  // visible.
  app.maxCols = 2;

  // Expand id-1 by clicking on it.
  $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' ).click();

  // Wait for the children to be rendered.
  setTimeout( function() {
    // Expand id-5 by clicking on it.
    $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-5"]' ).click();

    // Wait for the children to be rendered.
    setTimeout( function() {
      // Expand id-6 by clicking on it.
      $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-6"]' ).click();

      // Wait for the children to be rendered.
      setTimeout( function() {
        assert.equal(
          2,
          $wrapper.find( '.curricula-ui__column--collapsed' ).length,
          "There are 2 collapsed columns (the 1st ones)"
        );

        // A Top button should now be visible. Clicking on it should collapse
        // everything.
        $wrapper
          .find( '.curricula-ui__column:eq(2)' )
          .find( '.curricula-ui__column__button--show-root' )
          .click();

        // There should be no more collapsed columns.
        assert.equal(
          0,
          $wrapper.find( '.curricula-ui__column--collapsed' ).length,
          "There are no more collapsed columns"
        );

        done();
      }, 100 );
    }, 100 );
  }, 100 );
});

/**
 * Test collapsing items when another item is selected.
 */
QUnit.test( "collapse items upon selecting another item", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      column = app.createRootColumn(),
      done = assert.async();

  // Expand id-1 by clicking on it.
  $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' ).click();

  // Wait for the children to be rendered.
  setTimeout( function() {
    // Expand id-5 by clicking on it.
    $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-5"]' ).click();

    // Check the current state.
    assert.equal( false, app.getItemDatabase().get( 'id-3' ).get( 'expanded' ), "Item id-3 is not yet expanded." );
    assert.equal( true, app.getItemDatabase().get( 'id-1' ).get( 'expanded' ), "Item id-1 was correctly expanded." );
    assert.equal( true, app.getItemDatabase().get( 'id-5' ).get( 'expanded' ), "Item id-5 was correctly expanded." );
    assert.equal(
      3,
      app.getColumnDatabase().length,
      "There are 3 expanded columns"
    );

    // Select item "id-3", which is a sibling of "id-1". This should collapse both
    // levels expanded above.
    $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-3"]' ).click();

    // Check the current state. We do not check id-5 now, because it will remain
    // "expanded", although not visible. This is good; we use a "lazy-collapse"
    // approach, where we only collapse what is actually visible.
    assert.equal( true, app.getItemDatabase().get( 'id-3' ).get( 'expanded' ), "Item id-2 was correctly expanded." );
    assert.equal( false, app.getItemDatabase().get( 'id-1' ).get( 'expanded' ), "Item id-1 was correctly collapsed." );
    assert.equal(
      2,
      app.getColumnDatabase().length,
      "There are 2 expanded columns"
    );

    // Wait for the children to be rendered.
    setTimeout( function() {
      // Now, click on id-1 again. This should collapse id-3 AND id-5, which was
      // still "expanded" from our previous click.
      $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' ).click();

      // Check the current state.
      assert.equal( false, app.getItemDatabase().get( 'id-3' ).get( 'expanded' ), "Item id-3 was correctly collapsed." );
      assert.equal( true, app.getItemDatabase().get( 'id-1' ).get( 'expanded' ), "Item id-1 was correctly expanded." );
      assert.equal( false, app.getItemDatabase().get( 'id-5' ).get( 'expanded' ), "Item id-5 was correctly collapsed." );
      assert.equal(
        2,
        app.getColumnDatabase().length,
        "There are 2 expanded columns"
      );
      done();
    }, 100 );
  }, 100 );
});

/**
 * Test collapsing columns when expanding beyond the "max visible columns" limit.
 */
QUnit.test( "collapse columns upon expanding beyond maxCols", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      column = app.createRootColumn()
      done = assert.async();

  // Only show 2 columns.
  app.maxCols = 2;

  // Expand id-1 by clicking on it.
  $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-1"]' ).click();

  // Wait for the children to be rendered.
  setTimeout( function() {
    // Expand id-5 by clicking on it.
    $wrapper.find( '.curricula-ui__column__wrapper__list__item[data-model-id="id-5"]' ).click();

    // Check the current state.
    assert.equal( true, app.getItemDatabase().get( 'id-1' ).get( 'expanded' ), "Item id-1 was correctly expanded." );
    assert.equal( true, app.getItemDatabase().get( 'id-5' ).get( 'expanded' ), "Item id-5 was correctly expanded." );
    assert.equal(
      1,
      $wrapper.find( '.curricula-ui__column--collapsed' ).length,
      "There is 1 collapsed column (the 1st one)"
    );
    assert.equal(
      3,
      $wrapper.find( '.curricula-ui__column' ).length,
      'There are 3 "active" columns'
    );

    done();
  }, 100 );
});

/**
 * Test triggering events.
 */
QUnit.test( "triggering events", function( assert ) {
  var done = assert.async();

  var app = new CurriculaUI.Core( _testGetJSONItems() ),
      doneEvent = assert.async( 3 );

  // Prepare the event listeners.
  app.on( 'category:chain1', function( arg1, arg2, eventApp ) {
    doneEvent();
    assert.ok( true, "The category:chain1 event was invoked." );
    assert.equal( app, eventApp, "The passed application is the same as the one listened to." );
    assert.equal( 1, arg1, "The passed arguments are correct." );
    assert.equal( "arg2", arg2, "The passed arguments are correct." );
  } );
  app.on( 'category:chain1:chain2', function( arg1, arg2, eventApp ) {
    doneEvent();
    assert.ok( true, "The category:chain1:chain2 event was invoked." );
    assert.equal( app, eventApp, "The passed application is the same as the one listened to." );
    assert.equal( 1, arg1, "The passed arguments are correct." );
    assert.equal( "arg2", arg2, "The passed arguments are correct." );
  } );

  // First, trigger a single event, no chain.
  app.triggerEvent( 'category', 'chain1', 1, "arg2" );

  // Next, with a chain.
  app.triggerEvent( 'category', [ 'chain1', 'chain2' ], 1, "arg2" );

  done();
});

/**
 * Test the summary item selection.
 */
QUnit.test( "summary item selection", function( assert ) {
  var doneSelectEvent = assert.async(),
      app = new CurriculaUI.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column = app.createRootColumn();

  // Set an item as being expanded. We will check it later.
  app.getItemDatabase().get( 'id-3' ).set( 'expanded', true ),

  app.on( 'summary:item:select', function() {
    // There should be 3 visible columns.
    assert.equal(
      3,
      app.getColumnDatabase().length,
      "There are 3 expanded columns"
    );
    // Items 1 and 5 should be expanded.
    assert.ok(
      app.getItemDatabase().get( 'id-1' ).get( 'expanded' ),
      "Item id-1 is correctly expanded."
    );
    assert.ok(
      app.getItemDatabase().get( 'id-5' ).get( 'expanded' ),
      "Item id-5 is correctly expanded."
    );
    assert.notOk(
      app.getItemDatabase().get( 'id-3' ).get( 'expanded' ),
      "Item id-3 is correctly collapsed."
    );
    // Item 6 should be highlighted.
    assert.ok(
      app.getItemDatabase().get( 'id-6' ).get( 'highlighted' ),
      "Item id-6 is correctly highlighted."
    );
    doneSelectEvent();
  });

  // Activate items, so they "appear" in the summary.
  var item6 = app.getItemDatabase().get( 'id-6' );
  item6.set( 'active', true );
  app.recursiveCheck( item6 );

  // For performance reasons, the `CurriculaUI.SummaryTreeView` doesn't
  // render on immediately. For this reason, we need to wait a few ms before
  // triggering our click. See `CurriculaUI.SummaryTreeView#render()`
  // for more information.
  setTimeout( function() {
    // Now, simulate a click on this item.
    app.summaryView.$el.find( '[data-model-id="id-6"]' ).click();
  }, 20 );
});

/**
 * Test the search element interaction.
 */
QUnit.test( "search element interactions", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new CurriculaUI.Core( _testGetJSONItems(), $wrapper ),
      doneSelectEvent = assert.async(),
      column = app.createRootColumn(),
      $search, searchSelectCallback;

  // Mock jQuery UI's autocomplete plugin. Hijack the settings passed to it.
  $.fn.autocomplete = function( settings ) {
    searchSelectCallback = settings.select;
  };

  // Prepare an event listener.
  app.on( 'search:select', function() {
    // There should be 3 visible columns.
    assert.equal(
      3,
      app.getColumnDatabase().length,
      "There are 3 expanded columns"
    );
    // Items 1 and 5 should be expanded.
    assert.ok(
      app.getItemDatabase().get( 'id-1' ).get( 'expanded' ),
      "Item id-1 is correctly expanded."
    );
    assert.ok(
      app.getItemDatabase().get( 'id-5' ).get( 'expanded' ),
      "Item id-5 is correctly expanded."
    );
    // Item 6 should be highlighted.
    assert.ok(
      app.getItemDatabase().get( 'id-6' ).get( 'highlighted' ),
      "Item id-6 is correctly highlighted."
    );
    // The search was hidden.
    assert.notOk( $wrapper.find( '.curricula-ui-search' ).length, "The search was closed." );
    doneSelectEvent();
  });

  // The search is not active by default.
  app.activateSearch();

  // Show it.
  app.showSearch();
  $search = $wrapper.find( '.curricula-ui-search' );
  assert.ok( $search.length, "The search is visible." );

  // Hide it.
  $wrapper.find( '.curricula-ui-search__cancel' ).click();
  assert.notOk( $wrapper.find( '.curricula-ui-search' ).length, "The search was closed." );

  // Show it again, and simulate a "select" on item id-6. This should hide the
  // search, as well as expand the columns and highlight id-6. See the event
  // listener above.
  app.showSearch();
  searchSelectCallback( null, { item: { value: 'id-6' } } );
});


/**
 * Define a test item database, mimicking the structure a JSON file would
 * contain.
 */
function _testGetJSONItems() {
  return {
    root: [
      {
        type: "type-a",
        name: [ "Root item A" ],
        hasChildren: true,
        id: "id-1"
      },
      {
        type: "type-a",
        name: [ "Root item B" ],
        hasChildren: false,
        id: "id-2"
      },
      {
        type: "type-b",
        name: [ "Root item C" ],
        hasChildren: true,
        id: "id-3"
      }
    ],
    "id-1": [
      {
        type: "type-c",
        name: [ "Root item A; child item A" ],
        hasChildren: false,
        id: "id-4"
      },
      {
        type: "type-c",
        name: [ "Root item A; child item B" ],
        hasChildren: true,
        id: "id-5"
      }
    ],
    "id-5": [
      {
        type: "type-d",
        name: [ "Root item A; child item B; child item A" ],
        hasChildren: true,
        id: "id-6"
      },
      {
        type: "type-d",
        name: [ "Root item A; child item B; child item B" ],
        hasChildren: false,
        id: "id-7"
      }
    ],
    "id-3": [
      {
        type: "type-e",
        name: [ "Root item C; child item A" ],
        hasChildren: false,
        id: "id-8"
      },
      {
        type: "type-f",
        name: [ "Root item C; child item B" ],
        hasChildren: false,
        id: "id-9"
      }
    ],
    "id-6": [
      {
        type: "type-e",
        name: [ "Root item A; child item B; child item A; child item A" ],
        hasChildren: false,
        id: "id-10"
      }
    ]
  }
}
