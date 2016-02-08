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

QUnit.test( "view events", function( assert ) {
  assert.expect( 4 );

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
  // Click on the checkbox, twice.
  view1.render().$el.find('input').trigger( 'change' );
  view1.render().$el.find('input').trigger( 'change' );


});
