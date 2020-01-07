'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');

const utilsModels = require('strapi-utils').models;
const utils = require('./utils');
const relations = require('./relations');
const { findComponentByGlobalId } = require('./utils/helpers');

module.exports = ({ models, target, plugin = false }, ctx) => {
  const { instance } = ctx;

  // Parse every authenticated model.
  Object.keys(models).map(model => {
    const definition = models[model];
    definition.orm = 'mongoose';
    definition.associations = [];
    definition.globalName = _.upperFirst(_.camelCase(definition.globalId));
    definition.loadedModel = {};
    // Set the default values to model settings.
    _.defaults(definition, {
      primaryKey: '_id',
      primaryKeyType: 'string',
    });

    if (!plugin) {
      global[definition.globalName] = {};
    }

    const componentAttributes = Object.keys(definition.attributes).filter(key =>
      ['component', 'dynamiczone'].includes(definition.attributes[key].type)
    );

    const scalarAttributes = Object.keys(definition.attributes).filter(key => {
      const { type } = definition.attributes[key];
      return (
        type !== undefined &&
        type !== null &&
        type !== 'component' &&
        type !== 'dynamiczone'
      );
    });

    const relationalAttributes = Object.keys(definition.attributes).filter(
      key => {
        const { type } = definition.attributes[key];
        return type === undefined;
      }
    );

    // handle component and dynamic zone attrs
    if (componentAttributes.length > 0) {
      // create join morph collection thingy
      componentAttributes.forEach(name => {
        definition.loadedModel[name] = [
          {
            kind: String,
            ref: {
              type: mongoose.Schema.Types.ObjectId,
              refPath: `${name}.kind`,
            },
          },
        ];
      });
    }

    // handle scalar attrs
    scalarAttributes.forEach(name => {
      const attr = definition.attributes[name];

      definition.loadedModel[name] = {
        ...attr,
        ...utils(instance).convertType(attr.type),
      };
    });

    // handle relational attrs
    relationalAttributes.forEach(name => {
      buildRelation({
        definition,
        model,
        instance,
        name,
        attribute: definition.attributes[name],
      });
    });

    const schema = new instance.Schema(
      _.omitBy(definition.loadedModel, ({ type }) => type === 'virtual')
    );

    // Initialize lifecycle callbacks.
    const preLifecycle = {
      validate: 'beforeCreate',
      find: 'beforeFetchAll',
      findOne: 'beforeFetch',
      findOneAndUpdate: 'beforeUpdate',
      findOneAndRemove: 'beforeDestroy',
      remove: 'beforeDestroy',
      update: 'beforeUpdate',
      updateOne: 'beforeUpdate',
      save: 'beforeSave',
    };

    const findLifecycles = [
      'find',
      'findOne',
      'findOneAndUpdate',
      'findOneAndRemove',
    ];

    /*
        Override populate path for polymorphic association.
        It allows us to make Upload.find().populate('related')
        instead of Upload.find().populate('related.item')
      */

    const morphAssociations = definition.associations.filter(
      association => association.nature.toLowerCase().indexOf('morph') !== -1
    );

    const populateFn = createOnFetchPopulateFn({
      componentAttributes,
      morphAssociations,
      definition,
    });

    findLifecycles.forEach(key => {
      schema.pre(key, populateFn);
    });

    Object.keys(preLifecycle).forEach(key => {
      const fn = preLifecycle[key];

      if (_.isFunction(target[model.toLowerCase()][fn])) {
        schema.pre(key, function() {
          return target[model.toLowerCase()][fn](this);
        });
      }
    });

    const postLifecycle = {
      validate: 'afterCreate',
      findOneAndRemove: 'afterDestroy',
      remove: 'afterDestroy',
      update: 'afterUpdate',
      updateOne: 'afterUpdate',
      find: 'afterFetchAll',
      findOne: 'afterFetch',
      save: 'afterSave',
    };

    // Mongoose doesn't allow post 'remove' event on model.
    // See https://github.com/Automattic/mongoose/issues/3054
    Object.keys(postLifecycle).forEach(key => {
      const fn = postLifecycle[key];

      if (_.isFunction(target[model.toLowerCase()][fn])) {
        schema.post(key, function(doc, next) {
          target[model.toLowerCase()]
            [fn](this, doc)
            .then(next)
            .catch(err => {
              strapi.log.error(err);
              next(err);
            });
        });
      }
    });

    // Add virtual key to provide populate and reverse populate
    _.forEach(
      _.pickBy(definition.loadedModel, model => {
        return model.type === 'virtual';
      }),
      (value, key) => {
        schema.virtual(key.replace('_v', ''), {
          ref: value.ref,
          localField: '_id',
          foreignField: value.via,
          justOne: value.justOne || false,
        });
      }
    );

    target[model].allAttributes = _.clone(definition.attributes);

    // Use provided timestamps if the elemnets in the array are string else use default.
    const timestampsOption = _.get(definition, 'options.timestamps', true);
    if (_.isArray(timestampsOption)) {
      const [
        createAtCol = 'createdAt',
        updatedAtCol = 'updatedAt',
      ] = timestampsOption;

      schema.set('timestamps', {
        createdAt: createAtCol,
        updatedAt: updatedAtCol,
      });

      target[model].allAttributes[createAtCol] = {
        type: 'timestamp',
      };
      target[model].allAttributes[updatedAtCol] = {
        type: 'timestamp',
      };
    } else if (timestampsOption === true) {
      schema.set('timestamps', true);

      _.set(definition, 'options.timestamps', ['createdAt', 'updatedAt']);

      target[model].allAttributes.createdAt = {
        type: 'timestamp',
      };
      target[model].allAttributes.updatedAt = {
        type: 'timestamp',
      };
    }
    schema.set(
      'minimize',
      _.get(definition, 'options.minimize', false) === true
    );

    const refToStrapiRef = obj => {
      const ref = obj.ref;

      let plainData = typeof ref.toJSON === 'function' ? ref.toJSON() : ref;

      if (typeof plainData !== 'object') return ref;

      return {
        __contentType: obj.kind,
        ...ref,
      };
    };

    schema.options.toObject = schema.options.toJSON = {
      virtuals: true,
      transform: function(doc, returned) {
        // Remover $numberDecimal nested property.
        Object.keys(returned)
          .filter(key => returned[key] instanceof mongoose.Types.Decimal128)
          .forEach(key => {
            // Parse to float number.
            returned[key] = parseFloat(returned[key].toString());
          });

        morphAssociations.forEach(association => {
          if (
            Array.isArray(returned[association.alias]) &&
            returned[association.alias].length > 0
          ) {
            // Reformat data by bypassing the many-to-many relationship.
            switch (association.nature) {
              case 'oneMorphToOne':
                returned[association.alias] = refToStrapiRef(
                  returned[association.alias][0]
                );

                break;

              case 'manyMorphToMany':
              case 'manyMorphToOne':
                returned[association.alias] = returned[association.alias].map(
                  obj => refToStrapiRef(obj)
                );
                break;
              default:
            }
          }
        });

        componentAttributes.forEach(name => {
          const attribute = definition.attributes[name];
          const { type } = attribute;

          if (type === 'component') {
            if (Array.isArray(returned[name])) {
              const components = returned[name].map(el => el.ref);
              // Reformat data by bypassing the many-to-many relationship.
              returned[name] =
                attribute.repeatable === true
                  ? components
                  : _.first(components) || null;
            }
          }

          if (type === 'dynamiczone') {
            const components = returned[name].map(el => {
              return {
                __component: findComponentByGlobalId(el.kind).uid,
                ...el.ref,
              };
            });

            returned[name] = components;
          }
        });
      },
    };

    // Instantiate model.
    const Model = instance.model(
      definition.globalId,
      schema,
      definition.collectionName
    );

    Model.on('index', error => {
      if (error) {
        if (error.code === 11000) {
          strapi.log.error(
            `Unique constraint fails, make sure to update your data and restart to apply the unique constraint.\n\t- ${error.message}`
          );
        } else {
          strapi.log.error(
            `An index error happened, it wasn't applied.\n\t- ${error.message}`
          );
        }
      }
    });

    if (!plugin) {
      global[definition.globalName] = Model;
    }

    // Expose ORM functions through the `target` object.
    target[model] = _.assign(Model, target[model]);

    // Push attributes to be aware of model schema.
    target[model]._attributes = definition.attributes;
    target[model].updateRelations = relations.update;
  });
};

const createOnFetchPopulateFn = ({
  morphAssociations,
  componentAttributes,
  definition,
}) => {
  return function() {
    const populatedPaths = this.getPopulatedPaths();

    morphAssociations.forEach(association => {
      const { alias, nature } = association;

      if (['oneToManyMorph', 'manyToManyMorph'].includes(nature)) {
        this.populate({
          path: alias,
          match: {
            [`${association.via}.${association.filter}`]: association.alias,
            [`${association.via}.kind`]: definition.globalId,
          },
          options: {
            sort: '-createdAt',
          },
        });
        return;
      }

      if (populatedPaths.includes(alias)) {
        _.set(this._mongooseOptions.populate, [alias, 'path'], `${alias}.ref`);
      }
    });

    if (definition.modelType === 'component') {
      definition.associations
        .filter(ast => ast.autoPopulate !== false)
        .forEach(ast => {
          this.populate({ path: ast.alias });
        });
    }

    componentAttributes.forEach(key => {
      this.populate({ path: `${key}.ref` });
    });
  };
};

const buildRelation = ({ definition, model, instance, attribute, name }) => {
  const { nature, verbose } =
    utilsModels.getNature(attribute, name, undefined, model.toLowerCase()) ||
    {};

  // Build associations key
  utilsModels.defineAssociations(
    model.toLowerCase(),
    definition,
    attribute,
    name
  );

  switch (verbose) {
    case 'hasOne': {
      const ref = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.model].globalId
        : strapi.models[attribute.model].globalId;

      definition.loadedModel[name] = {
        type: instance.Schema.Types.ObjectId,
        ref,
      };
      break;
    }
    case 'hasMany': {
      const FK = _.find(definition.associations, {
        alias: name,
      });
      const ref = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.collection].globalId
        : strapi.models[attribute.collection].globalId;

      if (FK) {
        definition.loadedModel[name] = {
          type: 'virtual',
          ref,
          via: FK.via,
          justOne: false,
        };

        // Set this info to be able to see if this field is a real database's field.
        attribute.isVirtual = true;
      } else {
        definition.loadedModel[name] = [
          {
            type: instance.Schema.Types.ObjectId,
            ref,
          },
        ];
      }
      break;
    }
    case 'belongsTo': {
      const FK = _.find(definition.associations, {
        alias: name,
      });
      const ref = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.model].globalId
        : strapi.models[attribute.model].globalId;

      if (
        FK &&
        FK.nature !== 'oneToOne' &&
        FK.nature !== 'manyToOne' &&
        FK.nature !== 'oneWay' &&
        FK.nature !== 'oneToMorph'
      ) {
        definition.loadedModel[name] = {
          type: 'virtual',
          ref,
          via: FK.via,
          justOne: true,
        };

        // Set this info to be able to see if this field is a real database's field.
        attribute.isVirtual = true;
      } else {
        definition.loadedModel[name] = {
          type: instance.Schema.Types.ObjectId,
          ref,
        };
      }

      break;
    }
    case 'belongsToMany': {
      const targetModel = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.collection]
        : strapi.models[attribute.collection];

      const ref = targetModel.globalId;

      if (nature === 'manyWay') {
        definition.loadedModel[name] = [
          {
            type: instance.Schema.Types.ObjectId,
            ref,
          },
        ];
      } else {
        const FK = _.find(definition.associations, {
          alias: name,
        });

        // One-side of the relationship has to be a virtual field to be bidirectional.
        if ((FK && _.isUndefined(FK.via)) || attribute.dominant !== true) {
          definition.loadedModel[name] = {
            type: 'virtual',
            ref,
            via: FK.via,
          };

          // Set this info to be able to see if this field is a real database's field.
          attribute.isVirtual = true;
        } else {
          definition.loadedModel[name] = [
            {
              type: instance.Schema.Types.ObjectId,
              ref,
            },
          ];
        }
      }
      break;
    }
    case 'morphOne': {
      const FK = _.find(definition.associations, {
        alias: name,
      });
      const ref = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.model].globalId
        : strapi.models[attribute.model].globalId;

      definition.loadedModel[name] = {
        type: 'virtual',
        ref,
        via: `${FK.via}.ref`,
        justOne: true,
      };

      // Set this info to be able to see if this field is a real database's field.
      attribute.isVirtual = true;
      break;
    }
    case 'morphMany': {
      const FK = _.find(definition.associations, {
        alias: name,
      });
      const ref = attribute.plugin
        ? strapi.plugins[attribute.plugin].models[attribute.collection].globalId
        : strapi.models[attribute.collection].globalId;

      definition.loadedModel[name] = {
        type: 'virtual',
        ref,
        via: `${FK.via}.ref`,
      };

      // Set this info to be able to see if this field is a real database's field.
      attribute.isVirtual = true;
      break;
    }
    case 'belongsToMorph': {
      definition.loadedModel[name] = {
        kind: String,
        [attribute.filter]: String,
        ref: {
          type: instance.Schema.Types.ObjectId,
          refPath: `${name}.kind`,
        },
      };
      break;
    }
    case 'belongsToManyMorph': {
      definition.loadedModel[name] = [
        {
          kind: String,
          [attribute.filter]: String,
          ref: {
            type: instance.Schema.Types.ObjectId,
            refPath: `${name}.kind`,
          },
        },
      ];
      break;
    }
    default:
      break;
  }
};
