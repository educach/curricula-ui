QUnit.module( "ItemView" );

/**
 * Test initialization logic. It should not be possible to initialize an
 * ItemView without a model, or with an invalid model.
 */
QUnit.test( "initialize", function( assert ) {
  assert.throws(
    function() {
      var view = new ArchibaldCurriculum.ItemView();
    },
    "Initializing a view without any model throws an error."
  );

  assert.throws(
    function() {
      var item = new ArchibaldCurriculum.ItemModel(),
          view = new ArchibaldCurriculum.ItemView({ model: item });
    },
    "Initializing a view with an invalid model throws an error."
  );
});

/**
 * Test model event binding. ItemViews should react on several model events.
 */
QUnit.test( "model events", function( assert ) {
  assert.expect( 5 );

  var doneChangeEvent = assert.async( 2 ),
      item1 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ] }),
      view1 = new ArchibaldCurriculum.ItemView({ model: item1 });
  view1.on( 'model:change', function() {
    assert.ok( true, "The view triggers a model:change event on updating its model." );
    doneChangeEvent();
  });
  view1.on( 'render', function() {
    assert.ok( true, "The view re-renders itself on updating its model." );
    doneChangeEvent();
  });
  item1.set( 'name', "Some new name" );

  var doneDestroyEvent = assert.async( 2 ),
      item2 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ] }),
      view2 = new ArchibaldCurriculum.ItemView({ model: item2 });
  view2.render().$el.appendTo( '#qunit-fixture' );
  assert.ok( view2.$el.parent()[0], "The view was correctly rendered and added to the DOM." );
  view2.on( 'model:destroy', function() {
    assert.ok( true, "The view triggers a model:destroy event on destroying its model." );
    doneDestroyEvent();
  });
  item2.destroy();
  assert.notOk( view2.$el.parent()[0], "The view was correctly removed from the DOM." );
  doneDestroyEvent();
});

/**
 * Test ItemView events. ItemViews trigger several events, as well as react to
 * multiple DOM events.
 */
QUnit.test( "view events", function( assert ) {
  assert.expect( 11 );

  var doneCheckboxEvent = assert.async( 2 ),
      checked = false,
      item1 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ], active: checked }),
      view1 = new ArchibaldCurriculum.ItemView({ model: item1, editable: true });
  view1.on( 'model:change', function( itemModel, itemView, e ) {
    // The active (checked) state should have changed.
    checked != checked;
    assert.ok( true, "The view triggers a model:change event on checking the checkbox." );
    assert.equal( itemModel.get( 'active'), checked, "The model active state correctly changed." );
    doneCheckboxEvent();
  });
  // (Un)check on the checkbox, twice.
  view1.render();
  view1.$el.find('input').change();
  view1.$el.find('input').change();

  var doneClickEvent = assert.async( 1 ),
      item2 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ] }),
      view2 = new ArchibaldCurriculum.ItemView({ model: item2, editable: true });
  view2.on( 'select', function() {
    assert.ok( true, "The view triggers a select event on being clicked." );
    doneClickEvent();
  });
  // Click on the element.
  view2.render();
  view2.$el.click();
  // A click on the checkbox should not bubble up.
  view2.$el.find('input').click();

  var doneDblClickEvent = assert.async( 2 ),
      item3 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ], active: false }),
      view3 = new ArchibaldCurriculum.ItemView({ model: item3, editable: true });
  view3.on( 'active', function( state, itemModel, itemView ) {
    assert.ok( true, "The view triggers a active event on being double-clicked." );
    assert.equal( state, true, "The passed state is correct." );
    assert.equal( itemModel.get( 'active'), true, "The model active state correctly changed." );
    doneDblClickEvent();
  });
  view3.on( 'unactive', function( state, itemModel, itemView ) {
    assert.ok( true, "The view triggers an unactive event on being double-clicked." );
    assert.equal( state, false, "The passed state is correct." );
    assert.equal( itemModel.get( 'active'), false, "The model active state correctly changed." );
    doneDblClickEvent();
  });
  // Double-click on the element, twice.
  view3.render();
  view3.$el.dblclick();
  view3.$el.dblclick();
});
