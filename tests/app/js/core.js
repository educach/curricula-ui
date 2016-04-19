QUnit.module( "Core" );


/**
 * Test the constructor logic.
 */
QUnit.test( "constructor", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) );
  assert.ok( !!app.getItemDatabase(), "The item database is correctly set." );
  assert.ok( app.getWrapper().length, "The wrapper is correctly set." );
});

/**
 * Test the column collection event binding.
 */
QUnit.test( "column collection events", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      columns = app.getColumnDatabase(),
      $dummy = $( '<div>Column</div>' ).appendTo( '#qunit-fixture' ),
      model = new ArchibaldCurriculum.ColumnModel({ column: $dummy });
  // Add the column, and then remove it again. This should trigger the remove
  // event, which should remove the $dummy element from the DOM.
  assert.ok( document.contains( $dummy[ 0 ] ), "The column was correctly added to the DOM." );
  columns.add( model );
  columns.remove( model );
  assert.notOk( document.contains( $dummy[ 0 ] ), "The column was correctly removed from the DOM." );
});

/**
 * Test the column creation helper.
 */
QUnit.test( "column creation helper", function( assert ) {
  var app = new ArchibaldCurriculum.Core( _testGetJSONItems(), $( '#qunit-fixture' ) ),
      column = app.createColumn( _testGetJSONItems()[ 'root' ] );
  // Check the defaults.
  assert.notOk( column.isCollapsed(), "The column is not collapsed by default." );
  assert.ok( column.editable, "The column is editable by default." );
  // Check the column was added to the DOM.
  assert.ok( document.contains( column.$el[ 0 ] ), "The column was correctly added to the DOM." );
  // Check it was added to the column database.
  assert.ok( !!app.getColumnDatabase().where({ column: column }).length, "The column was correctly added to the database." );

  // Check passing params.
  column = app.createColumn( _testGetJSONItems()[ 'root' ], false, true );
  assert.ok( column.isCollapsed(), "The column is collapsed." );
  assert.notOk( column.editable, "The column is not editable." );
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
      column5 = app.createColumn( _testGetJSONItems()[ 'root' ] );
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
