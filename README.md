# backbone-model
## General
This model extends the Backbone.Model with some more features
- attribute type safety
- sub collection attributes
- sub model attributes
- attribute property [observer](https://github.com/DasRed/js-observer-object)
- [parametrized urls](https://github.com/DasRed/js-url-parametrized) for loading and saving from server

## Install
```
bower install backbone-model --save
```

## Usage
### Attribute definition
For every model you must define the attribute types object, which maps the model attributes to a specific javascript type.
Following types are available:
- Backbone.ModelEx.ATTRIBUTE_TYPE_NUMBER     ... defines this attribute as a number. This value will be converted to a native javascript number. If this converted value isNaN === true, a warning will be thrown. 
- Backbone.ModelEx.ATTRIBUTE_TYPE_STRING     ... defines this attribute as a string. This value will be converted to a native javascript string.
- Backbone.ModelEx.ATTRIBUTE_TYPE_BOOLEAN    ... defines this attribute as a boolean. This value will be converted to a native javascript boolean. The string values "True", "TRUE", "true" will be converted to TRUE. The string values "False", "FALSE", "false" will be converted to FALSE. All other will be converted to an Number and then to Boolean if isNaN === false.
- Backbone.ModelEx.ATTRIBUTE_TYPE_DATE       ... defines this attribute as a date string (e.g. 2017-05-26), which can be parse by the Date Object. If the value can not be parsed, a warning will be thrown. The attribute will be converted to a Date Object.
- Backbone.ModelEx.ATTRIBUTE_TYPE_DATETIME   ... defines this attribute as a date time string (e.g. 2017-05-26T09:49:56.998Z), which can be parse by the Date Object. If the value can not be parsed, a warning will be thrown. The attribute will be converted to a Date Object.
- Backbone.ModelEx.ATTRIBUTE_TYPE_TIME       ... defines this attribute as a time string (e.g. 10:11:12), which can be parse by the Date Object. If the value can not be parsed, a warning will be thrown. The attribute will be converted to a Date Object.
- Backbone.ModelEx.ATTRIBUTE_TYPE_COLLECTION ... defines this attribute as a Backbone Collection. This property must be an array. If it is not an array, a warning will be thrown. The attribute will be converted to a Backbone collection.
- Backbone.ModelEx.ATTRIBUTE_TYPE_ARRAY      ... defines this attribute as a javascript native array. This property must be an array. If it is not an array, a warning will be thrown.
- Backbone.ModelEx.ATTRIBUTE_TYPE_MODEL      ... defines this attribute as a Backbone Model. This property can be anything. The model must able to parse the data. The attribute will be converted to a Backbone Model.
- Backbone.ModelEx.ATTRIBUTE_TYPE_IGNORE     ... this attribute will be ignored. No conversion will be done for this attribute. The attribute will be untouched.

The attribute types will be defined by the property "attributeTypes".

If a model will be converted to JSON, every sub collection or sub model will be also converted to JSON and appended to the result object.

**Example**

This example shows, 
- how attribute types will be defined
- how a attribute can be a collection and
- how a attribute can be a model

```js
// definition of Child Model
function ChildModel(attributes, options) {
    Backbone.ModelEx.apply(this, arguments);
}

ChildModel.prototype = Object.create(Backbone.ModelEx, {
    attributeTypes: {
        value: {
            id: Backbone.ModelEx.ATTRIBUTE_TYPE_NUMBER,
            name: Backbone.ModelEx.ATTRIBUTE_TYPE_STRING,
            birthday: Backbone.ModelEx.ATTRIBUTE_TYPE_DATE
        },
        enumerable: true,
        configurable: true,
        writable: true
    }
});

// definition of Children Collection
function ChildrenCollection() {
    this.model = ChildModel;
    Backbone.CollectionEx.apply(this, arguments);
}

ChildrenCollection.prototype = Object.create(Backbone.CollectionEx, {});

// definition of Parent Model
function ParentModel(attributes, options) {
    this.children = new ChildrenCollection();
    
    Backbone.ModelEx.apply(this, arguments);
}

ParentModel.prototype = Object.create(Backbone.ModelEx, {
    attributeTypes: {
        value: {
            id: Backbone.ModelEx.ATTRIBUTE_TYPE_NUMBER,
            text: Backbone.ModelEx.ATTRIBUTE_TYPE_STRING,
            birthday: Backbone.ModelEx.ATTRIBUTE_TYPE_DATE,
            children: Backbone.ModelEx.ATTRIBUTE_TYPE_COLLECTION,
            partner: Backbone.ModelEx.ATTRIBUTE_TYPE_MODEL
        },
        enumerable: true,
        configurable: true,
        writable: true
    },
    
    children: {
        enumerable: true,
        configurable: true,
        get: function() {
            if (this._children === undefined) {
                this._children = new ChildrenCollection();
            }
            return this._children;
        }
    },
    
    partner: {
        enumerable: true,
        configurable: true,
        get: function() {
            if (this._partner === undefined) {
                this._partner = new ParentModel();
            }
            return this._partner;
        }
    }
});
```

### Attribute observation
Every model has the property "observer", which will be used for observation the attribute properties. The [observer](https://github.com/DasRed/js-observer-object) will not be created automatically. You must get the [observer](https://github.com/DasRed/js-observer-object) and bind your events to the [observer](https://github.com/DasRed/js-observer-object).

### Parametrized Urls
The model support [parametrized urls](https://github.com/DasRed/js-url-parametrized) for loading and saving from server. If you define a model, you can specify an url with parameter to the model it self and the model attributes.
This applies for the properties "url" and "urlRoot".

**Example**

```js
// definition of Child Model
function ChildModel(attributes, options) {
    this.url = '/api/model/child/:token';
    Backbone.ModelEx.apply(this, arguments);
}

ChildModel.prototype = Object.create(Backbone.ModelEx, {
    attributeTypes: {
        value: {
            id: Backbone.ModelEx.ATTRIBUTE_TYPE_NUMBER,
            name: Backbone.ModelEx.ATTRIBUTE_TYPE_STRING,
            birthday: Backbone.ModelEx.ATTRIBUTE_TYPE_DATE
        },
        enumerable: true,
        configurable: true,
        writable: true
    },
    
    token: {
        value: 'uitnqv398rcnq8thn437qfg78qghm39qhgf4893wx,
        enumerable: true,
        configurable: true,
        writable: true
    }
});
```

## Addition Options
- parseOnCreate ... define the default options.parse value for model creation. This value will be used in the constructor, if attributes will be defined. Default true
- waitDefault   ... define the default options.wait value for the functions "destroy", "fetch", "save"
