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
  item1.set( 'name', [ "Some new name" ] );

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

  var doneClickEvent = assert.async(),
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




QUnit.module( "ItemListView" );

/**
 * Test initialization logic. It should not be possible to initialize an
 * ItemListView without a collection.
 */
QUnit.test( "initialize", function( assert ) {
  assert.throws(
    function() {
      var view = new ArchibaldCurriculum.ItemListView();
    },
    "Initializing a view without any collection throws an error."
  );
});

/**
 * Test collection event binding. ItemListViews should react on several
 * collection events.
 */
QUnit.test( "collection events", function( assert ) {
  assert.expect( 6 );

  var doneAddRemoveEvent = assert.async( 2 ),
      doneRenderEvent = assert.async( 2 ),
      collection1 = new ArchibaldCurriculum.ItemCollection(),
      view1 = new ArchibaldCurriculum.ItemListView({ collection: collection1 }),
      addedItem = new ArchibaldCurriculum.ItemModel({ name: [ "Some name "] });
  view1.on( 'collection:add', function( item, collection, view ) {
    assert.ok( true, "The view triggers a collection:add event on adding a model." );
    assert.equal( item, addedItem, "The view passes the added item to the event handler." );
    doneAddRemoveEvent();
  });
  view1.on( 'collection:remove', function( item, collection, view ) {
    assert.ok( true, "The view triggers a collection:remove event on removing a model." );
    assert.equal( item, addedItem, "The view passes the removed item to the event handler." );
    doneAddRemoveEvent();
  });
  view1.on( 'render', function() {
    assert.ok( true, "The view is re-rendered whenever an item is removed or added to the collection." );
    doneRenderEvent();
  });
  collection1.add( addedItem );
  collection1.remove( addedItem );
});

/**
 * Test child ItemView event binding. ItemListViews should react on several
 * child view events.
 */
QUnit.test( "child view events", function( assert ) {
  assert.expect( 2 );

  var doneChangeEvent = assert.async(),
      doneSelectEvent = assert.async(),
      item1 = new ArchibaldCurriculum.ItemModel({ name: [ "Model name" ] }),
      collection1 = new ArchibaldCurriculum.ItemCollection([ item1 ]),
      view1 = new ArchibaldCurriculum.ItemListView({ collection: collection1 });
  view1.on( 'item:change', function() {
    assert.ok( true, "The view triggers a item:change event on updating a model in the collection." );
    doneChangeEvent();
  });
  view1.on( 'item:select', function() {
    assert.ok( true, "The view triggers a item:select event on clicking on a child view." );
    doneSelectEvent();
  });
  view1.render();
  item1.set( 'name', [ "Some new name" ] );
  view1.$el.find('li').click();
});

/**
 * Test ItemListView events. ItemListViews trigger several events, as well as
 * react to multiple DOM events.
 */
QUnit.test( "view events", function( assert ) {
  assert.expect( 6 );

  var doneCollapseExpandEvent = assert.async( 2 ),
      collection1 = new ArchibaldCurriculum.ItemCollection(),
      view1 = new ArchibaldCurriculum.ItemListView({ collection: collection1 });
  view1.on( 'column:collapse', function() {
    assert.ok( true, "The view triggers a column:collapse event on being collapsed." );
    assert.ok( view1.isCollapsed(), "The view gives correct information about being collapsed." );
    doneCollapseExpandEvent();
  });
  view1.on( 'column:expand', function() {
    assert.ok( true, "The view triggers a column:expand event on being collapsed." );
    assert.ok( view1.isExpanded(), "The view gives correct information about being expanded." );
    doneCollapseExpandEvent();
  });
  view1.collapse().expand();

  var doneGoBackEvent = assert.async(),
      doneGoToRootEvent = assert.async(),
      collection2 = new ArchibaldCurriculum.ItemCollection(),
      view2 = new ArchibaldCurriculum.ItemListView({ collection: collection2 });
  view2.on( 'column:go-back', function() {
    assert.ok( true, "The view triggers a column:go-back event on clicking on the Go Back button." );
    doneGoBackEvent();
  });
  view2.on( 'column:go-to-root', function() {
    assert.ok( true, "The view triggers a column:go-to-root event on clicking on the Go Back button." );
    doneGoToRootEvent();
  });
  view2.render();
  view2.$el.find('.archibald-column__button--show-parent').click();
  view2.$el.find('.archibald-column__button--show-root').click();
});




QUnit.module( "ItemInfoView" );

/**
 * Test initialization logic. It should not be possible to initialize an
 * ItemInfoView without a model, or with an invalid model.
 */
QUnit.test( "initialize", function( assert ) {
  assert.throws(
    function() {
      var view = new ArchibaldCurriculum.ItemInfoView();
    },
    "Initializing a view without any model throws an error."
  );

  assert.throws(
    function() {
      var item = new ArchibaldCurriculum.ItemModel(),
          view = new ArchibaldCurriculum.ItemInfoView({ model: item });
    },
    "Initializing a view with an invalid model throws an error."
  );
});

/**
 * Test view events. ItemInfoViews trigger several events.
 */
QUnit.test( "view events", function( assert ) {
  assert.expect( 1 );

  var doneRenderEvent = assert.async(),
      model1 = new ArchibaldCurriculum.ItemModel({ name: [ "Some name" ] }),
      view1 = new ArchibaldCurriculum.ItemInfoView({ model: model1 });
  view1.on( 'render', function() {
    assert.ok( true, "The view triggers a render event when rendered." );
    doneRenderEvent();
  });
  view1.render();
});




QUnit.module( "SummaryTreeView" );
