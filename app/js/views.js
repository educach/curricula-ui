/**
 * @file
 * ArchibaldCurriculum view definitions.
 */

(function(Backbone, _, Archibald) {

// Define the default templates here.
Archibald.templates = {

  item: '\
<% if (editable) { %>\
  <input type="checkbox"<% if (active) { %> checked<% } %>/>\
<% } %>\
<% for (var i in name) { %>\
  <%= name[i] %>\
  <% if (i < name.length - 1) {%><hr /><% } %>\
<% } %>\
<% if (hasChildren) { %>\
  <i class="icon-chevron-right" />\
<% } %>\
',

  itemList: '\
<div class="archibald-column__wrapper nano">\
  <ul class="archibald-column__wrapper__list nano-content"></ul>\
</div>\
<span class="archibald-column__button archibald-column__button--show-parent">\
  <i class="icon-chevron-left" /> Back\
</span>\
<span class="archibald-column__button archibald-column__button--show-root">\
  <i class="icon-chevron-left" /><i class="icon-chevron-left" /> Top\
</span>\
',

  itemInfo: '\
<div class="archibald-item-info__type">\
  <span class="archibald-item-info__type__label"><%= typeLabel %>:</span>\
  <% if (typeUrl) { %>\
    <a class="archibald-item-info__type__url" target="_blank" href="<%= typeUrl %>">\
  <% } %>\
  <span class="archibald-item-info__type__value"><%= type %></span>\
  <% if (typeUrl) { %>\
    </a>\
  <% } %>\
  <% if (typeDescription) { %>\
    <div class="archibald-item-info__type__description">\
      <span class="archibald-item-info__type__description__label"><%= typeDescriptionLabel %>:</span>\
      <span class="archibald-item-info__type__description__value"><%= typeDescription %></span>\
    </div>\
  <% } %>\
</div>\
<hr />\
<div class="archibald-item-info__item">\
  <h4><%= itemDescriptionLabel %></h4>\
  <p><%= itemDescription %></p>\
  <% if (itemUrl) { %>\
    <a class="archibald-item-info__item__url" target="_blank" href="<%= itemUrl %>"><%= itemUrlLabel %></a>\
  <% } %>\
</div>\
',

  summaryList: '\
<li\
  data-model-id="<%= id %>"\
  class="archibald-summary-tree__list__item\
    <% if (hasCycle1) {%>has-cycle-1<% } %>\
    <% if (hasCycle2) {%>has-cycle-2<% } %>\
    <% if (hasCycle3) {%>has-cycle-3<% } %>\
  "\
>\
  <span>\
    <% for (var i in name) { %>\
      <%= name[i] %>\
      <% if (i < name.length - 1) {%><hr /><% } %>\
    <% } %>\
  </span>\
  <%= children %>\
</li>\
'

};

/**
 * Item view.
 *
 * This view represents a single item in a column.
 *
 * @see ArchibaldCurriculum.ItemModel
 */
Archibald.ItemView = Backbone.View.extend({
  tagName: 'li',
  className: 'archibald-column__wrapper__list__item',
  tpl: _.template(Archibald.templates.item),
  events: {
    "change input": "updateModel",
    "click": "triggerSelect",
    "dblclick": "doubleClick",
    "click input": "preventBubble"
  },
  initialize: function(args) {
    var errors;
    if (!this.model) {
      throw "Cannot initialize an ItemView without a model.";
    }
    else if (errors = this.model.validate()) {
      throw "Cannot initialize an ItemView with an invalid model. Errors: " + errors.join(', ');
    }

    this.editable = typeof args !== 'undefined' ? !!args.editable : false;

    var that = this;
    this.model
      .bind('change', function() {
        that.trigger('model:change', that.model, that);
        that.render();
      })
      .bind('destroy', function() {
        that.trigger('model:destroy', that.model, that);
        that.remove();
      });
  },
  render: function() {
    this.$el.empty();

    // We set many classes based on the model's values. However, we set these
    // on our $el element itself. So we need to add these classes here instead
    // of through the template.
    this.$el.toggleClass('archibald-column__wrapper__list__item--active', !!this.model.get('active'));
    this.$el.toggleClass('archibald-column__wrapper__list__item--has-children', !!this.model.get('hasChildren'));
    this.$el.toggleClass('archibald-column__wrapper__list__item--expanded', !!this.model.get('expanded'));
    this.$el.toggleClass('archibald-column__wrapper__list__item--highlighted', !!this.model.get('highlighted'));

    // Same thing for the ID.
    this.$el.attr('id', 'archibald-column__wrapper__list__item-' + this.model.get('id'));

    // Same thing for the cycle data.
    // @todo This should not depend on any structured data. Either render any
    //       data in it, or let other code register the 'render' event and add
    //       stuff to the DOM.
    if (
      typeof this.model.get('data') !== 'undefined' &&
      typeof this.model.get('data').cycle !== 'undefined' &&
      typeof this.model.get('data').cycle.indexOf !== 'undefined'
    ) {
      for (var i in { 1:1, 2:2, 3:3 }) {
        this.$el.toggleClass('has-cycle-' + i, this.model.get('data').cycle.indexOf(i) !== -1);
      }
    }

    if (this.model.has('name')) {
      // Prepare the template variables.
      var variables = this.model.toJSON();
      variables.editable = this.editable;

      this.$el.html(this.tpl(variables));
    } else {
      this.$el.html('');
    }

    this.trigger('render', this.model, this);

    return this;
  },
  updateModel: function(e) {
    this.model.set('active', this.$(e.target).is(':checked'));
    this.trigger('model:change', this.model, this, e);
    this.triggerActiveChange();
  },
  triggerSelect: function(e) {
    this.trigger('select', this.model, this, e);
  },
  doubleClick: function(e) {
    e.stopPropagation();
    this.model.set('active', !this.$el.find('input').is(':checked'));
    this.trigger('model:change', this.model, this, e);
    this.triggerActiveChange();
  },
  preventBubble: function(e) {
    e.stopPropagation();
  },
  triggerActiveChange: function() {
    var state = this.model.get('active');
    this.trigger(state ? 'active' : 'unactive', state, this.model, this);
  }
});

/**
 * Item list view.
 *
 * A column of items.
 */
Archibald.ItemListView = Backbone.View.extend({
  className: 'archibald-column',
  tpl: _.template(Archibald.templates.itemList),
  events: {
    "click .archibald-column__button--show-parent": "triggerGoBack",
    "click .archibald-column__button--show-root": "triggerGoToBeginning"
  },
  initialize: function(args) {
    if (!this.collection) {
      throw "Cannot initialize an ItemListView without a collection.";
    }

    this.editable = !!args.editable;

    var that = this;
    this.collection
      .bind('add remove', function() {
        that.render();
      });
  },
  render: function() {
    this.$el.empty();
    this.$el.html(this.tpl());

    var $ul = this.$el.find('ul'),
        that = this;
    this.collection.forEach(function(model) {
      var item = new Archibald.ItemView({ model: model, editable: that.editable });
      item
        .on('change', function(e) {
          that.triggerItemEvent('change', model, e);
        })
        .on('select', function(e) {
          that.triggerItemEvent('select', model, e);
        });
      item.render();
      $ul.append(item.$el);
    });

    return this;
  },
  collapse: function() {
    this.$el.addClass('archibald-column--collapsed');
    this.trigger('column:collapse', this.collection, this);
  },
  expand: function() {
    this.$el.removeClass('archibald-column--collapsed');
    this.trigger('column:expand', this.collection, this);
  },
  isCollapsed: function() {
    return this.$el.hasClass('archibald-column--collapsed');
  },
  isExpanded: function() {
    return !this.isCollapsed();
  },
  triggerItemEvent: function(event, itemModel, e) {
    this.trigger('item:' + event, itemModel, this.collection, this, e);
  },
  triggerGoBack: function(e) {
    this.trigger('column:go-back', this.collection, this, e);
  },
  triggerGoToBeginning: function(e) {
    this.trigger('column:go-to-root', this.collection, this, e);
  }
});

/**
 * Item info view.
 *
 * This view represents a single item's information.
 *
 * @see ArchibaldCurriculum.ItemModel
 */
Archibald.ItemInfoView = Backbone.View.extend({
  className: 'archibald-item-info__wrapper',
  tpl: _.template(Archibald.templates.itemInfo),
  initialize: function(args) {
    var errors;
    if (!this.model) {
      throw "Cannot initialize an ItemInfoView without a model.";
    }
    else if (errors = this.model.validate()) {
      throw "Cannot initialize an ItemInfoView with an invalid model. Errors: " + errors.join(', ');
    }

    this.typeLabel = typeof args.typeLabel !== 'undefined' ? args.typeLabel : "Type";
    this.typeDescriptionLabel = typeof args.typeDescriptionLabel !== 'undefined' ? args.typeDescriptionLabel : "Type description";
    this.itemDescriptionLabel = typeof args.itemDescriptionLabel !== 'undefined' ? args.itemDescriptionLabel : "Description and usage";
    this.itemUrlLabel = typeof args.itemUrlLabel !== 'undefined' ? args.itemUrlLabel : "More information";

  },
  render: function() {
    this.$el.empty();

    if (this.model.has('name')) {
      // Prepare the template variables.
      var variables = this.model.toJSON();
      variables.typeLabel = this.typeLabel;
      variables.typeDescriptionLabel = this.typeDescriptionLabel;
      variables.itemDescriptionLabel = this.itemDescriptionLabel;
      variables.itemUrlLabel = this.itemUrlLabel;

      // Dummy data. This is needed until the JSON structure is completed.
      variables.typeUrl = 'http://www.google.com';
      variables.type = (['Lorem ipsum', 'Dolor sit amet', 'Consectetur elit'])[Math.floor(Math.random() * 3)];
      variables.typeDescription = ([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nisl tortor, mollis at ultrices et, cursus non libero. In lobortis pellentesque purus ac pellentesque.',
        'Lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non, sagittis.',
        'In lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non'
      ])[Math.floor(Math.random() * 3)];
      variables.itemUrl = 'http://www.goog.com';
      variables.itemDescription = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nisl tortor, mollis at ultrices et, cursus non libero. In lobortis pellentesque purus ac pellentesque. Etiam purus mauris, blandit sit amet tincidunt non, sagittis et lacus. Suspendisse vel semper ex.';

      this.$el.html(this.tpl(variables));
    } else {
      this.$el.html('');
    }

    return this;
  }
});

/**
 * Summary tree view.
 *
 * A tree of currently active items.
 */
Archibald.SummaryTreeView = Backbone.View.extend({
  className: 'archibald-summary-tree',
  tpl: _.template(Archibald.templates.summaryList),
  events: {
    "mouseover li > span": "mouseOver",
    "mouseout li > span": "mouseOut",
    "click li": "triggerSelect"
  },
  initialize: function(args) {
    if (!this.collection) {
      throw "Cannot initialize an SummaryTreeView without a collection.";
    }

    var that = this;
    this.collection
      .bind('change remove add', function() {
        that.render();
      });
  },
  render: function() {
    var that = this;

    // Actual render call. See below for more information.
    var render = function() {
      that.$el.empty();
      that.$el.append(recursiveRender('root'));
    };

    // Recursive tree-render function.
    var recursiveRender = function(parentId) {
      var children = that.collection.where({ parentId: parentId, active: true }),
          html = '';

      if (children.length) {
        html = '<ul class="archibald-summary-tree__list">';
        children.forEach(function(model) {
          // Render a single item. Prepare its data.
          var variables = model.toJSON();
          if (typeof model.get('data').cycle.indexOf !== 'undefined') {
            for (var i in { 1:1, 2:2, 3:3 }) {
              variables['hasCycle' + i] = model.get('data').cycle.indexOf(i) !== -1;
            }
          }
          variables.children = recursiveRender(model.get('id'));

          html += that.tpl(variables);
        });
        html += '</ul>';
      }

      return html;
    };

    // The render function can be called very often, sometimes several times
    // per ms. We don't want that. So, we put a little timeout and wait. If the
    // render function hasn't been called again for a certain time, we proceed
    // with the rendering. Otherwise, we cancel the render, and wait again.
    if (typeof this.timeout !== 'undefined') {
      this.timeout = clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(function() {
      render();
      that.timeout = clearTimeout(that.timeout);
    }, 10);

    return this;
  },
  mouseOver: function(e) {
    e.stopPropagation();
    this.$(e.target).parent().addClass('hover').parents('li').addClass('child-hovered');
  },
  mouseOut: function(e) {
    this.$(e.target).parent().removeClass('hover').parents('li').removeClass('child-hovered');
  },
  triggerSelect: function(e) {
    e.stopPropagation();
    var itemModel = this.collection.get(this.$(e.currentTarget).attr('data-model-id'));
    this.trigger('summary:select-item', itemModel, this.collection, this, e);
  }
});

})(Backbone, _, window.ArchibaldCurriculum || (window.ArchibaldCurriculum = {}));
