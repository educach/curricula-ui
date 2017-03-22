QUnit.module( "ItemModel" );

QUnit.test( "validation", function( assert ) {
  var item1 = new CurriculaUI.ItemModel();
  assert.deepEqual(
    item1.validate(),
    [ "An item requires a name." ],
    "An item without a name should not validate."
  );

  var item2 = new CurriculaUI.ItemModel({ name: "Some name" });
  assert.deepEqual(
    item2.validate(),
    null,
    "A complete item should validate (default values applied)."
  );

  var item3 = new CurriculaUI.ItemModel({ name: "Some name", parentId: null });
  assert.deepEqual(
    item3.validate(),
    [ "An item requires a parentId." ],
    "Explicitly setting the parentId to null should block validation."
  );
});
