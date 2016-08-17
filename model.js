'use strict';

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['lodash', 'backbone', 'object-observer', 'url-parametrized', 'backbone-prototype-compatibility'], function (lodash, Backbone, ObjectObserver, UrlParametrized) {
            return Backbone.ModelEx = factory(lodash, Backbone.Model, ObjectObserver, UrlParametrized, Backbone.compatibility);
        });

    } else if (typeof exports !== 'undefined') {
        root.Backbone.ModelEx = factory(root.lodash, root.Backbone.Model, root.ObjectObserver, root.UrlParametrized, root.Backbone.compatibility);

    } else {
        root.Backbone.ModelEx = factory(root.lodash, root.Backbone.Model, root.ObjectObserver, root.UrlParametrized, root.Backbone.compatibility);
    }
}(this, function (lodash, BackboneModel, ObjectObserver, UrlParametrized, compatibility) {

    /**
     * @param {Model} model
     * @param {String} propertyName
     * @param {String} propertyType
     * @returns {Model}|{Collection}
     * @throws Error
     */
    function getInstanceForProperty(model, propertyName, propertyType) {
        // try it with a getter
        var propertyNameGetter = 'get' + propertyName.charAt(0).toUpperCase() + propertyName.substr(1);
        if (model[propertyNameGetter] instanceof Function) {
            return model[propertyNameGetter]();
        }

        if (model[propertyName] === undefined || model[propertyName] === null) {
            throw new Error('The model property "' + propertyName + '" must be defined to use for the attribute type "' + propertyType + '" on the attribute "' + propertyName + '".');
        }

        // this can be a collection
        if ((model[propertyName].toJSON instanceof Function) === true) {
            return model[propertyName];
        }

        // it can be an constructor
        if (model[propertyName] instanceof Function && model[propertyName].__super__ !== undefined) {
            model[propertyName] = new model[propertyName]();
            return model[propertyName];
        }

        throw new Error('The model property "' + propertyName + '" must be an instance or constructor to use the attribute type "' + propertyType + '" on the attribute "' + propertyName + '".');
    }

    /**
     * @param {Model} model
     * @param {String} propertyName
     * @param {String} propertyType
     * @param {Model} value
     * @returns {Model}|{Collection}
     * @throws Error
     */
    function setInstanceForProperty(model, propertyName, propertyType, value) {
        // try it with a getter
        var propertyNameSetter = 'set' + propertyName.charAt(0).toUpperCase() + propertyName.substr(1);
        if (model[propertyNameSetter] instanceof Function) {
            return model[propertyNameSetter](value);
        }

        if (model[propertyName] !== undefined) {
            model[propertyName] = value;
            return model;
        }

        if (model[propertyName] === undefined || model[propertyName] === null) {
            throw new Error('The model property "' + propertyName + '" must be defined to use for the attribute type "' + propertyType + '" on the attribute "' + propertyName + '".');
        }

        // this can be a collection or model
        if ((model[propertyName].toJSON instanceof Function) === true) {
            return model[propertyName];
        }

        throw new Error('The model property "' + propertyName + '" must be instance to use the attribute type "' + propertyType + '" on the attribute "' + propertyName + '" with setter.');
    }

    var excludeProperties = {
        collection: true,
        parse: true,
        unset: true,
        silent: true
    };

    /**
     * Model
     *
     * @param {Object} attributes
     * @param {Object} options
     */
    function Model(attributes, options) {
        this.attributes = this.attributes || {};

        options = options || {};
        if (this.parseOnCreate === true && options.parse === undefined) {
            options.parse = true;
        }

        // copy options
        for (var key in options) {
            if (excludeProperties[key] === true) {
                continue;
            }
            if (this[key] !== undefined) {
                this[key] = options[key];
            }
        }

        // validation
        if ((this.attributeTypes instanceof Object) === false) {
            throw new Error('The property "attributeTypes" of a model must be defined!');
        }

        BackboneModel.call(this, attributes, options);

        this.attributesPrevious = lodash.clone(attributes) || null;
    }

    Model.ATTRIBUTE_TYPE_NUMBER     = 'number';
    Model.ATTRIBUTE_TYPE_STRING     = 'string';
    Model.ATTRIBUTE_TYPE_BOOLEAN    = 'boolean';
    Model.ATTRIBUTE_TYPE_DATE       = 'date';
    Model.ATTRIBUTE_TYPE_DATETIME   = 'datetime';
    Model.ATTRIBUTE_TYPE_TIME       = 'time';
    Model.ATTRIBUTE_TYPE_COLLECTION = 'collection';
    Model.ATTRIBUTE_TYPE_MODEL      = 'model';

    // prototype
    Model.prototype = Object.create(BackboneModel.prototype, {
        /**
         * mapping of attributes types
         *
         * @var {Object}
         */
        attributeTypes: {
            value: null,
            enumerable: true,
            configurable: true,
            writable: true
        },

        /**
         * attributes as loaded or saved
         *
         * @var {Object}
         */
        attributesPrevious: {
            value: null,
            enumerable: true,
            configurable: true,
            writable: true
        },

        /**
         * defaults
         *
         * @var {Object}
         */
        defaults: {
            value: null,
            enumerable: true,
            configurable: true,
            writable: true
        },

        /**
         * @var {String}
         */
        idAttribute: {
            value: 'id',
            enumerable: true,
            configurable: true,
            writable: true
        },

        /**
         * @var {ObjectObserver}
         */
        observer: {
            enumerable: true,
            configurable: true,
            get: function () {
                // object of model is not correct instantiated... waits
                if (this.cid === undefined) {
                    return undefined;
                }

                if (this._observer === undefined) {
                    var properties = {};
                    var propertyType;
                    for (var propertyName in this.attributeTypes) {
                        propertyType = this.attributeTypes[propertyName];
                        if (propertyType === Model.ATTRIBUTE_TYPE_COLLECTION || propertyType === Model.ATTRIBUTE_TYPE_MODEL) {
                            continue;
                        }
                        properties[propertyName] = true;
                    }

                    this._observer = new ObjectObserver(this.attributes, {
                        autoObserve: true,
                        properties: properties
                    });
                }

                return this._observer;
            }
        },

        /**
         * automatic parsing on creation
         *
         * @var {Boolean}
         */
        parseOnCreate: {
            value: true,
            enumerable: true,
            configurable: true,
            writable: true
        },

        /**
         * url
         *
         * @var {String}
         */
        url: {
            enumerable: true,
            configurable: true,
            get: function () {
                // no url defined...
                if (this._url === undefined) {
                    return BackboneModel.prototype.url.apply(this);
                }

                // create the parser
                if (this._urlParameter === undefined) {
                    this._urlParameter     = new UrlParametrized();
                    this._urlParameter.url = this._url;
                }

                // parsing
                return this._urlParameter.parse(this, this.attributes);
            },
            set: function (url) {
                this._url = url;
            }
        },

        /**
         * url root
         *
         * @var {String}
         */
        urlRoot: {
            enumerable: true,
            configurable: true,
            get: function () {
                // no url defined...
                if (this._urlRoot === undefined) {
                    return undefined;
                }

                // create the parser
                if (this._urlRootParameter === undefined) {
                    this._urlRootParameter     = new UrlParametrized();
                    this._urlRootParameter.url = this._urlRoot;
                }

                // parsing
                return this._urlRootParameter.parse(this, this.attributes);
            },
            set: function (url) {
                this._urlRoot = url;
            }
        },

        /**
         * @var {Boolean}
         */
        waitDefault: {
            value: true,
            enumerable: true,
            configurable: true,
            writable: true
        }
    });

    /**
     * clears this model from memory and all dependencies
     *
     * @returns {Model}
     */
    Model.prototype.clearFromMemory = function () {
        this.off();

        if (this._observer !== undefined) {
            this._observer.off();
            this._observer.unobserve();
        }

        delete this._observer;
        delete this._urlParameter;
        delete this._urlRootParameter;

        return this;
    };

    /**
     * correct clonig
     *
     * @returns {Model}
     */
    Model.prototype.clone = function () {
        var attributes = this.toJSON();
        var construct  = this.constructor;

        return new construct(attributes);
    };

    /**
     * destroy with default wait
     *
     * @param {Object} options
     * @returns {Model}
     */
    Model.prototype.destroy = function (options) {
        options      = options || {};
        options.wait = options.wait !== undefined ? options.wait : this.waitDefault;

        BackboneModel.prototype.destroy.call(this, options);

        return this;
    };

    /**
     * fetch
     *
     * @param {Object} options
     * @returns {Model}
     */
    Model.prototype.fetch = function (options) {
        var self    = this;
        var success = undefined;

        options      = options || {};
        options.wait = options.wait !== undefined ? options.wait : this.waitDefault;

        if (options.wait === true) {
            success         = options.success;
            options.success = function (model, resp, optionsSuccess) {
                self.attributesPrevious = null;
                if (success) {
                    success(model, resp, optionsSuccess);
                }
            };
        }
        else {
            this.attributesPrevious = null;
        }

        BackboneModel.prototype.fetch.call(this, options);

        return this;
    };

    /**
     * parsing of the attributes
     *
     * @param {Object} attributes
     * @param {Object} options
     * @returns {Object}
     */
    Model.prototype.parse = function (attributes, options) {
        var attributeType;
        var value;
        var propertyName;
        var number;
        var valueConverted;

        // convert simple attributes to object by using the id if the type matched
        if (typeof attributes !== 'object' && typeof attributes === this.attributeTypes[this.idAttribute]) {
            value = attributes;
            attributes = {};
            attributes[this.idAttribute] = value;
        }

        // call parent
        attributes = BackboneModel.prototype.parse.call(this, attributes, options);

        // test properties in attributes if they are defined in attributeTypes
        for (propertyName in attributes) {
            attributeType = this.attributeTypes[propertyName];
            // exists propertyName?
            if (attributeType === undefined) {
                throw new Error('Can not parse model property "' + propertyName + '" in model. The property is not defined in "attributeTypes"!');
            }

            value = attributes[propertyName];

            // not found nothing to do
            if (value === null || value === undefined) {
                continue;
            }

            // convert
            // write to a collection property direct on the model
            if (attributeType === Model.ATTRIBUTE_TYPE_COLLECTION) {
                getInstanceForProperty(this, propertyName, attributeType).reset(value, {
                    parse: true
                });
                delete attributes[propertyName];
            }

            // write to a model property direct on the model
            else if (attributeType === Model.ATTRIBUTE_TYPE_MODEL) {
                if (value instanceof Model) {
                    setInstanceForProperty(this, propertyName, attributeType, value);
                }
                else {
                    getInstanceForProperty(this, propertyName, attributeType).set(value, {
                        parse: true
                    });
                }
                delete attributes[propertyName];
            }

            // convert to number
            else if (attributeType === Model.ATTRIBUTE_TYPE_NUMBER) {
                if (typeof value !== 'number' || isNaN(value) === true) {
                    number = Number(value);
                    if (isNaN(number) === true) {
                        throw new Error('The model property "' + propertyName + '" must be a number but the value "' + String(value) + '" can not be converted to a number.');
                    }

                    value = number;
                }
            }

            // convert to boolean
            else if (attributeType === Model.ATTRIBUTE_TYPE_BOOLEAN) {
                if (typeof value !== 'boolean') {
                    if (value === 'True' || value === 'TRUE' || value === 'true') {
                        value = true;
                    }
                    else if (value === 'False' || value === 'FALSE' || value === 'false') {
                        value = false;
                    }
                    else {
                        valueConverted = Number(value);
                        if (isNaN(valueConverted) === false) {
                            value = Boolean(valueConverted);
                        }
                        else {
                            value = false;
                        }
                    }
                }
            }

            // convert to date
            else if (attributeType === Model.ATTRIBUTE_TYPE_DATE || attributeType === Model.ATTRIBUTE_TYPE_DATETIME || attributeType === Model.ATTRIBUTE_TYPE_TIME) {
                if ((value instanceof Date) === false) {
                    valueConverted = new Date(value);
                    if (isNaN(valueConverted.getTime()) === true) {
                        throw new Error('Model attribute "' + propertyName + '" with "' + String(value) + '" is not an date.');
                    }
                    value = valueConverted;
                }
            }

            // strings
            else if (attributeType === Model.ATTRIBUTE_TYPE_STRING) {
                if (typeof value !== 'string') {
                    value = String(value);
                }
            }

            // unknown type
            else {
                throw new Error('Model attributeType "' + attributeType + '" does not exists.');
            }

            // write back
            if (attributes[propertyName] !== undefined && attributes[propertyName] !== value) {
                attributes[propertyName] = value;
            }
        }

        return attributes;
    };

    /**
     * restores model attributes values, if changes was made and not saved
     *
     * @returns {Model}
     */
    Model.prototype.restore = function () {
        // TODO is this required to trigger something in Backbone.Model by calling this method?
        var previousAttributes = this.previousAttributes();

        for (var propertyName in this.attributesPrevious) {
            if (this.attributes[propertyName] !== this.attributesPrevious[propertyName]) {
                this.set(propertyName, this.attributesPrevious[propertyName]);
            }
        }

        this.changed             = null;
        this._previousAttributes = undefined;
        this.attributesPrevious  = null;

        return this;
    };

    /**
     * save with default wait
     *
     * @param {Object}|{String} key
     * @param {*} val
     * @param {Object} options
     * @returns {Model}
     */
    Model.prototype.save = function (key, val, options) {
        var self          = this;
        var success       = undefined;
        var optionsObject = undefined;

        if (key == null || typeof key === 'object') {
            optionsObject = val = val || {};
        }
        else {
            optionsObject = options = options || {};
        }

        optionsObject.wait = optionsObject.wait !== undefined ? optionsObject.wait : this.waitDefault;
        if (optionsObject.wait === true) {
            success               = optionsObject.success;
            optionsObject.success = function (model, resp, optionsSuccess) {
                self.attributesPrevious = null;
                if (success) {
                    success(model, resp, optionsSuccess);
                }
            };
        }
        else {
            this.attributesPrevious = null;
        }

        BackboneModel.prototype.save.call(this, key, val, options);

        return this;
    };

    /**
     * set function
     *
     * @param {Object}|{String} key
     * @param {string} val
     * @param {Object} options
     * @returns {Model}
     */
    Model.prototype.set = function (key, val, options) {
        var success  = undefined;
        var complete = undefined;

        if (key == null || typeof key === 'object') {
            options = val;
        }

        if (options !== undefined) {
            success  = options.success;
            complete = options.complete;
        }

        // store original values
        if (this.attributesPrevious === null) {
            this.attributesPrevious = lodash.clone(this.attributes);
        }

        if (options !== undefined && options.parse === true && typeof key === 'object') {
            key = this.parse(key, options);
        }

        // call original set
        BackboneModel.prototype.set.apply(this, arguments);

        if (success instanceof Function && options.xhr === undefined) {
            success.call(this, this, undefined, options);
        }

        if (complete instanceof Function && options.xhr === undefined) {
            complete.call(this, this, undefined, options);
        }

        return this;
    };

    /**
     * to JSON
     *
     * @param {Object} options
     * @returns {Object}
     */
    Model.prototype.toJSON = function (options) {
        var attributes = BackboneModel.prototype.toJSON.apply(this, arguments);

        // type conversion
        attributes = lodash.reduce(this.attributeTypes, function (acc, propertyType, propertyName) {
            // convert back for JSON
            // write to a collection property direct on the model
            // write to a model property direct on the model
            if (propertyType === Model.ATTRIBUTE_TYPE_COLLECTION || propertyType === Model.ATTRIBUTE_TYPE_MODEL) {
                var instance = getInstanceForProperty(this, propertyName, propertyType);
                if (instance !== null) {
                    acc[propertyName] = getInstanceForProperty(this, propertyName, propertyType).toJSON(options);
                }
            }

            return acc;
        }, attributes, this);

        return attributes;
    };

    return compatibility(Model);
}));
