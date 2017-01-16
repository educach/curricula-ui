LOM curriculum data selecor
===========================

This is a JS component which can be used to simplify the selection of *curriculum information*, mainly in context of describing educational resources using the *[LOM](https://en.wikipedia.org/wiki/Learning_object_metadata)* standard. 

A little introduction
---------------------

*LOM* (*Learning Object Metadata*) is a standard used to describe educational resources. This standard defines several *property groups*, or *fields*, each describing a specific aspect of the resource. Field 9 is called *Classification*, and can be used to classify the resource using specific *curricula*. 

Furthermore, *[LOM-CH](https://en.wikipedia.org/wiki/Learning_object_metadata#LOM-CH)*, a superset of *LOM* that is used in Switzerland, has a custom field, 10 *Curriculum*, which provides more flexibility for describing a resource in contect of a specific curriculum.

The selection of this data through an interface can be tedious. This component greatly simplifies the process, by allowing users to quickly find specific elements using a search, selecting full "paths" by selecting "leaf elements", easy browsing, etc.

Installation
------------

You can use [Bower](https://bower.io/) to install the component:

    bower install educach-curricula-ui

Alternatively, you can also [download](https://github.com/educach/curricula-ui/releases) one of the releases.

Include the `app/css/styles.css` CSS file, as well as all dependencies ([jQuery](https://jquery.com/), [Underscore](http://underscorejs.org/), [Backbone](http://backbonejs.org/) and [jQuery UI](https://jqueryui.com/)). Finally, include the library files, making sure `core.js` is included last:

* `app/js/models.js`
* `app/js/views.js`
* `app/js/core.js`

Test drive
----------

You can test a basic implementation [here](https://educach.github.io/curricula-ui/example/).

You can test an implementation for the *[Plan d'études Romand](https://www.plandetudes.ch/)* [here](https://educach.github.io/curricula-ui/example/per_example.html).

Documentation
-------------

* [Core](https://educach.github.io/curricula-ui/docs/core.html)
* [Models](https://educach.github.io/curricula-ui/docs/models.html)
* [Views](https://educach.github.io/curricula-ui/docs/views.html)

