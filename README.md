LOM curriculum data selecor
===========================

[![Build Status](https://travis-ci.org/educach/curricula-ui.svg?branch=master)](https://travis-ci.org/educach/curricula-ui) [![Coverage Status](https://coveralls.io/repos/github/educach/curricula-ui/badge.svg?branch=master)](https://coveralls.io/github/educach/curricula-ui?branch=master)

This is a JS component which can be used to simplify the selection of *curriculum information*, mainly in context of describing educational resources using the *[LOM](https://en.wikipedia.org/wiki/Learning_object_metadata)* standard.

A little introduction
---------------------

*LOM* (*Learning Object Metadata*) is a standard used to describe educational resources. This standard defines several *property groups*, or *fields*, each describing a specific aspect of the resource. Field 9 is called *Classification*, and can be used to classify the resource using specific *curricula*.

Furthermore, *[LOM-CH](https://en.wikipedia.org/wiki/Learning_object_metadata#LOM-CH)*, a superset of *LOM* that is used in Switzerland, has a custom field, 10 *Curriculum*, which provides more flexibility for describing a resource in context of a specific curriculum.

The selection of this data through an interface can be tedious. This component greatly simplifies the process, by allowing users to quickly find specific elements using a search, selecting full "paths" by selecting "leaf elements", easy browsing, etc.

Installation
------------

### Bower

Call:

```bash
bower install educach-curricula-ui
```

Include the `app/css/styles.css` CSS file, as well as all dependencies ([jQuery](https://jquery.com/), [Underscore](http://underscorejs.org/), [Backbone](http://backbonejs.org/) and [jQuery UI](https://jqueryui.com/)). Finally, include the library files, making sure `core.js` is included last:

* `app/js/models.js`
* `app/js/views.js`
* `app/js/core.js`

### Download and build using Node

[Download](https://github.com/educach/curricula-ui/releases) one of the releases. Change directory into the downloaded and extracted code, and call:

```bash
npm install
npm run build
```

This will build the source code inside `build/`. You can then include `build/all.min.css` and `build/all.min.js`.

Usage
-----

Prepare the dataset. This is a hash of all elements, keyed by their parent element. Think of a "flat tree" structure.

The root elements must reside under a key called "root".

Example:

```json
{
    "root": [
        {
            "id": "571de66f7a3e07.69885629",
            "type": "subject_area",
            "name": [
                "Ideo"
            ],
            "data": {},
            "hasChildren": true
        },
        {
            "id": "571de66f7a47d9.29989618",
            "type": "subject_area",
            "name": [
                "Si"
            ],
            "data": {},
            "hasChildren": true
        }
    ],
    "571de66f7a3e07.69885629": [
        {
            "id": "571de66f7a6d84.13224691",
            "type": "subject",
            "name": [
                "Autem Facilisis Quadrum"
            ],
            "data": {},
            "hasChildren": true
        },
        {
            "id": "571de66f7a7218.57923983",
            "type": "subject",
            "name": [
                "Cogo Sudo"
            ],
            "data": {},
            "hasChildren": true
        }
    ],
    "571de66f7a6d84.13224691": [
        {
            "id": "571de66f7ab3d9.28736212",
            "type": "area_of_competence",
            "name": [
                "Laoreet Nutus Pala"
            ],
            "data": {},
            "hasChildren": true
        },
        {
            "id": "571de66f7ab8b4.74482236",
            "type": "area_of_competence",
            "name": [
                "Defui Ideo"
            ],
            "data": {},
            "hasChildren": true
        }
    ],
    "571de66f7ab3d9.28736212": [
        {
            "id": "571de66f7ad4e8.65427750",
            "type": "theme",
            "name": [
                "Euismod Iaceo Ratis"
            ],
            "data": {},
            "hasChildren": true
        }
    ],
    "571de66f7ad4e8.65427750": [
        {
            "id": "571de66f7aea38.64601689",
            "type": "competence",
            "name": [
                "Modo"
            ],
            "data": {},
            "hasChildren": true
        }
    ]
}
```

See [`example/json/`](https://github.com/educach/curricula-ui/tree/master/example/json) for some working examples.

Each element *must* have the following properties:

* `id`: the unique identifier of the element. Can be a string (recommended)
* `type`: an arbitrary *type*. This can vary greatly depending on the curriculum being described. Usually, each curriculum has its own set of standard types, which can then be used here.
* `name`: a list of strings. If an element has a long name, it is recommended to split it up into chunks (think "paragraphs"). The first element must be the most important, and will always be shown.
* `hasChildren`: A boolean indicating if this element has any child items.

Furthermore, the following *optional* property can be used:

* `data`: This object can contain any data relevant for the current implementation. For example, *Plan d'études Romand* implementations use this `data` key to store information like *PER codes*.

Any other properties will simply be ignored.

Full element example:

```json
{
    "id": "cycles-2-domaines-6",
    "type": "domaine",
    "name": [
        "Formation g\u00e9n\u00e9rale"
    ],
    "data": {
        "cycle": "2"
    },
    "hasChildren": true
}
```

When initializing a new `Core`, pass this dataset  (as a JS object, *not* as a JSON string), as well as a DOM element you want to attach to:

```javascript
var app = new CurriculaUI.Core( items, $( '#my-app' ) );
```

And that's it. You can pass custom settings as a third parameter:

```javascript
var app = new CurriculaUI.Core( items, $( '#my-app' ) {
  useSearch: false
} );
```

See [Core::setSettings()](https://github.com/educach/curricula-ui/blob/master/app/js/core.js#L204) for more information on what settings you can set, and their default values.

You can listen to many events during the application execution. For example, when the app is rendered:

```javascript
app.on( 'app:render', function() {
  // Do something...
} );
```

You can listen to the following events on the `Core` element:

* `app:render`: The application was rendered.
* `item:select`: The user clicked on one of the items in the editor view.
* `item:change`: An item was updated.
* `item:change:active`: And item's `active` state was updated.
* `column:go-back`: The user clicked on the *Back* button.
* `column:go-to-root`: The user clicked on the *Top* button.
* `search:results`: The search found some results.
* `search:render`: The search results are being rendered.
* `search:select`: The user clicked on one of the search results.
* `search:cancel`: The user canceled or closed the search modal.
* `summary:render`: The summary part is being (re)rendered.
* `summary:item:select`: The user clicked on one of the items in the summary view.
* `item-info:render`: The item information drawer is being (re)rendered.
* `item-info:expand`: The item information drawer is being expanded.
* `item-info:collapse`: The item information drawer is being collapsed.

Furthermore so you can listen to all standard Backbone Model and View events. Read the [Backbone documentation](http://backbonejs.org/) for more information.

Unit tests
----------

To run unit tests using Node, call:

```
npm test
```

You can also run the tests in your browser using QUnit [here](https://educach.github.io/curricula-ui/tests/).


Demonstration
-------------

You can test a basic implementation [here](https://educach.github.io/curricula-ui/example/).

You can test an implementation for the [*Plan d'études Romand*](https://www.plandetudes.ch/) (aka *PER*) [here](https://educach.github.io/curricula-ui/example/per_example.html).

Documentation
-------------

The above instructions should be enough to get you going. For more information, check the source code. It is well commented, and should allow you to get a good understanding of how everything works.

* [Core](https://github.com/educach/curricula-ui/blob/master/app/js/core.js)
* [Models](https://github.com/educach/curricula-ui/blob/master/app/js/models.js)
* [Views](https://github.com/educach/curricula-ui/blob/master/app/js/views.js)

Check the use-cases provided in [`examples/`](https://github.com/educach/curricula-ui/tree/master/example) for some real-world examples.
