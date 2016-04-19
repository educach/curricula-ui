QUnit.module( "Core" );


/**
 * Test the constructor logic.
 */
QUnit.test( "constructor", function( assert ) {
  var $wrapper = $( '<div></div>' ).appendTo( '#qunit-fixture' ),
      app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $wrapper );

  assert.ok( !!app.getItemDatabase(), "The item database is correctly set." );
  assert.ok( app.getWrapper().length, "The wrapper is correctly set." );
  assert.notEqual( '', $wrapper[ 0 ].id, "The wrapper received an ID." );
});

/**
 * Test the settings extension logic.
 */
QUnit.test( "settings extension", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ), {
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
    ArchibaldCurriculum.ItemListView,
    app.getSettings().itemListView,
    "The default settings are correctly kept."
  );
});

/**
 * Test the column collection event binding.
 */
QUnit.test( "column collection events", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems() ),
      columns = app.getColumnDatabase(),
      $dummy = $( '<div>Column</div>' ).appendTo( '#qunit-fixture' ),
      model = new ArchibaldCurriculum.ColumnModel({ column: $dummy });

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
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column = app.createColumn( _testGetJSONItems()[ 'root' ] );

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
});

/**
 * Test the column left/right selection helpers.
 */
QUnit.test( "column left/right selection helpers", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
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

  var doneConfirmEvent = assert.async( 2 ),
      doneChangeActiveEvent = assert.async( 3 ),
      done = assert.async(),
      app = new ArchibaldCurriculum.Core( _testGetJSONItems() ),
      chain = [ 'id-6', 'id-5', 'id-1' ],
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

  // Unchecking item id-1 will also uncheck items id-5 and id-6.
  var item1 = database.get( 'id-1' );
  item1.set( 'active', false );
  app.recursiveCheck( item1 );
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
});

/**
 * Test the responsive logic helpers.
 */
QUnit.test( "responsive logic helpers", function( assert ) {
  var done = assert.async();

  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
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
    $( 'iframe.__archibald-curricula-ui--hacky-scrollbar-resize-listener__' ).remove();

    done();
  }, 200 );
});

/**
 * Test unhighlighting items.
 */
QUnit.test( "unhighlighting items", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems() ),
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
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems() ),
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
 * Test triggering events.
 */
QUnit.test( "triggering events", function( assert ) {
  var done = assert.async();

  var app = new ArchibaldCurriculum.Core( _testGetJSONItems() ),
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
        hasChildren: false,
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
    ]
  }
}
