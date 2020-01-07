'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');

const DynamicZoneScalar = require('../types/dynamiczoneScalar');

const Aggregator = require('./Aggregator');
const Query = require('./Query.js');
const Mutation = require('./Mutation.js');
const Types = require('./Types.js');
const Schema = require('./Schema.js');
const { toSingular, toPlural } = require('./naming');

const convertAttributes = (attributes, globalId) => {
  return Object.keys(attributes)
    .filter(attribute => attributes[attribute].private !== true)
    .reduce((acc, attribute) => {
      // Convert our type to the GraphQL type.
      acc[attribute] = Types.convertType({
        definition: attributes[attribute],
        modelName: globalId,
        attributeName: attribute,
      });
      return acc;
    }, {});
};

const generateEnumDefinitions = (attributes, globalId) => {
  return Object.keys(attributes)
    .filter(attribute => attributes[attribute].type === 'enumeration')
    .map(attribute => {
      const definition = attributes[attribute];

      const name = Types.convertEnumType(definition, globalId, attribute);
      const values = definition.enum.map(v => `\t${v}`).join('\n');
      return `enum ${name} {\n${values}\n}\n`;
    })
    .join('');
};

const generateDynamicZoneDefinitions = (attributes, globalId, schema) => {
  Object.keys(attributes)
    .filter(attribute => attributes[attribute].type === 'dynamiczone')
    .forEach(attribute => {
      const { components } = attributes[attribute];

      const typeName = `${globalId}${_.upperFirst(
        _.camelCase(attribute)
      )}DynamicZone`;

      if (components.length === 0) {
        // Create dummy type because graphql doesn't support empty ones

        schema.definition += `type ${typeName} { _:Boolean}`;
        schema.definition += `\nscalar EmptyQuery\n`;
      } else {
        const componentsTypeNames = components.map(componentUID => {
          const compo = strapi.components[componentUID];
          if (!compo) {
            throw new Error(
              `Trying to creating dynamiczone type with unkown component ${componentUID}`
            );
          }

          return compo.globalId;
        });

        const unionType = `union ${typeName} = ${componentsTypeNames.join(
          ' | '
        )}`;

        schema.definition += `\n${unionType}\n`;
      }

      const inputTypeName = `${typeName}Input`;
      schema.definition += `\nscalar ${inputTypeName}\n`;

      schema.resolvers[typeName] = {
        __resolveType(obj) {
          return strapi.components[obj.__component].globalId;
        },
      };

      schema.resolvers[inputTypeName] = new DynamicZoneScalar({
        name: inputTypeName,
        attribute,
        globalId,
        components,
      });
    });
};

const mutateAssocAttributes = (associations = [], attributes) => {
  associations
    .filter(association => association.type === 'collection')
    .forEach(association => {
      attributes[
        `${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`
      ] = attributes[association.alias];

      delete attributes[association.alias];
    });
};

const buildAssocResolvers = model => {
  const contentManager =
    strapi.plugins['content-manager'].services['contentmanager'];

  const { primaryKey, associations = [] } = model;

  return associations
    .filter(association => model.attributes[association.alias].private !== true)
    .reduce((resolver, association) => {
      const target = association.model || association.collection;
      const targetModel = strapi.getModel(target, association.plugin);

      switch (association.nature) {
        case 'oneToManyMorph':
        case 'manyMorphToOne':
        case 'manyMorphToMany':
        case 'manyToManyMorph': {
          resolver[association.alias] = async obj => {
            if (obj[association.alias]) {
              return obj[association.alias];
            }

            const entry = await contentManager.fetch(
              {
                id: obj[primaryKey],
                model: model.uid,
              },
              [association.alias]
            );

            return entry[association.alias];
          };
          break;
        }
        default: {
          resolver[association.alias] = async (obj, options) => {
            // Construct parameters object to retrieve the correct related entries.
            const params = {
              model: targetModel.uid,
            };

            let queryOpts = {};

            if (association.type === 'model') {
              params[targetModel.primaryKey] = _.get(
                obj,
                [association.alias, targetModel.primaryKey],
                obj[association.alias]
              );
            } else {
              const queryParams = Query.amountLimiting(options);
              queryOpts = {
                ...queryOpts,
                ...Query.convertToParams(_.omit(queryParams, 'where')), // Convert filters (sort, limit and start/skip)
                ...Query.convertToQuery(queryParams.where),
              };

              if (
                ((association.nature === 'manyToMany' &&
                  association.dominant) ||
                  association.nature === 'manyWay') &&
                _.has(obj, association.alias) // if populated
              ) {
                _.set(
                  queryOpts,
                  ['query', targetModel.primaryKey],
                  obj[association.alias]
                    ? obj[association.alias]
                        .map(val => val[targetModel.primaryKey] || val)
                        .sort()
                    : []
                );
              } else {
                _.set(
                  queryOpts,
                  ['query', association.via],
                  obj[targetModel.primaryKey]
                );
              }
            }

            return association.model
              ? strapi.plugins.graphql.services.loaders.loaders[
                  targetModel.uid
                ].load({
                  params,
                  options: queryOpts,
                  single: true,
                })
              : strapi.plugins.graphql.services.loaders.loaders[
                  targetModel.uid
                ].load({
                  options: queryOpts,
                  association,
                });
          };
          break;
        }
      }

      return resolver;
    }, {});
};

const buildModel = (model, { schema, isComponent = false } = {}) => {
  const { globalId, primaryKey } = model;

  schema.resolvers[globalId] = {
    id: obj => obj[primaryKey],
    ...buildAssocResolvers(model),
  };

  const initialState = {
    id: 'ID!',
    [primaryKey]: 'ID!',
  };

  if (_.isArray(_.get(model, 'options.timestamps'))) {
    const [createdAtKey, updatedAtKey] = model.options.timestamps;
    initialState[createdAtKey] = 'DateTime!';
    initialState[updatedAtKey] = 'DateTime!';
  }

  const attributes = convertAttributes(model.attributes, globalId);
  mutateAssocAttributes(model.associations, attributes);
  _.merge(attributes, initialState);

  schema.definition += generateEnumDefinitions(model.attributes, globalId);
  generateDynamicZoneDefinitions(model.attributes, globalId, schema);

  const description = Schema.getDescription({}, model);
  const fields = Schema.formatGQL(attributes, {}, model);
  const typeDef = `${description}type ${globalId} {${fields}}\n`;

  schema.definition += typeDef;
  schema.definition += Types.generateInputModel(model, globalId, {
    allowIds: isComponent,
  });
};

/**
 * Construct the GraphQL query & definition and apply the right resolvers.
 *
 * @return Object
 */

const buildShadowCRUD = (models, plugin) => {
  const initialState = {
    definition: '',
    query: {},
    mutation: {},
    resolvers: { Query: {}, Mutation: {} },
  };

  if (_.isEmpty(models)) {
    return initialState;
  }

  return Object.keys(models).reduce((acc, name) => {
    const model = models[name];

    const { globalId, primaryKey } = model;

    // Setup initial state with default attribute that should be displayed
    // but these attributes are not properly defined in the models.
    const initialState = {
      [primaryKey]: 'ID!',
    };

    // always add an id field to make the api database agnostic
    if (primaryKey !== 'id') {
      initialState['id'] = 'ID!';
    }

    acc.resolvers[globalId] = {
      // define the default id resolver
      id(parent) {
        return parent[model.primaryKey];
      },
    };

    // Add timestamps attributes.
    if (_.isArray(_.get(model, 'options.timestamps'))) {
      const [createdAtKey, updatedAtKey] = model.options.timestamps;
      initialState[createdAtKey] = 'DateTime!';
      initialState[updatedAtKey] = 'DateTime!';
    }

    const _schema = _.cloneDeep(
      _.get(strapi.plugins, 'graphql.config._schema.graphql', {})
    );

    const { type = {}, resolver = {} } = _schema;

    // Convert our layer Model to the GraphQL DL.
    const attributes = convertAttributes(model.attributes, globalId);
    mutateAssocAttributes(model.associations, attributes);
    _.merge(attributes, initialState);

    acc.definition += generateEnumDefinitions(model.attributes, globalId);
    generateDynamicZoneDefinitions(model.attributes, globalId, acc);

    const description = Schema.getDescription(type[globalId], model);
    const fields = Schema.formatGQL(attributes, type[globalId], model);
    const typeDef = `${description}type ${globalId} {${fields}}\n`;

    acc.definition += typeDef;

    // Add definition to the schema but this type won't be "queriable" or "mutable".
    if (
      type[model.globalId] === false ||
      _.get(type, `${model.globalId}.enabled`) === false
    ) {
      return acc;
    }

    const singularName = toSingular(name);
    const pluralName = toPlural(name);
    // Build resolvers.
    const queries = {
      singular:
        _.get(resolver, `Query.${singularName}`) !== false
          ? Query.composeQueryResolver({
              _schema,
              plugin,
              name,
              isSingular: true,
            })
          : null,
      plural:
        _.get(resolver, `Query.${pluralName}`) !== false
          ? Query.composeQueryResolver({
              _schema,
              plugin,
              name,
              isSingular: false,
            })
          : null,
    };

    // check if errors
    Object.keys(queries).forEach(type => {
      // The query cannot be built.
      if (_.isError(queries[type])) {
        strapi.log.error(queries[type]);
        strapi.stop();
      }
    });

    if (_.isFunction(queries.singular)) {
      _.merge(acc, {
        query: {
          [`${singularName}(id: ID!)`]: model.globalId,
        },
        resolvers: {
          Query: {
            [singularName]: queries.singular,
          },
        },
      });
    }

    if (_.isFunction(queries.plural)) {
      _.merge(acc, {
        query: {
          [`${pluralName}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${model.globalId}]`,
        },
        resolvers: {
          Query: {
            [pluralName]: queries.plural,
          },
        },
      });
    }

    // TODO:
    // - Implement batch methods (need to update the content-manager as well).
    // - Implement nested transactional methods (create/update).
    const capitalizedName = _.upperFirst(singularName);
    const mutations = {
      create:
        _.get(resolver, `Mutation.create${capitalizedName}`) !== false
          ? Mutation.composeMutationResolver({
              _schema,
              plugin,
              name,
              action: 'create',
            })
          : null,
      update:
        _.get(resolver, `Mutation.update${capitalizedName}`) !== false
          ? Mutation.composeMutationResolver({
              _schema,
              plugin,
              name,
              action: 'update',
            })
          : null,
      delete:
        _.get(resolver, `Mutation.delete${capitalizedName}`) !== false
          ? Mutation.composeMutationResolver({
              _schema,
              plugin,
              name,
              action: 'delete',
            })
          : null,
    };

    // Add model Input definition.
    acc.definition += Types.generateInputModel(model, name);

    Object.keys(mutations).forEach(type => {
      if (_.isFunction(mutations[type])) {
        let mutationDefinition;
        let mutationName = `${type}${capitalizedName}`;

        // Generate the Input for this specific action.
        acc.definition += Types.generateInputPayloadArguments(
          model,
          name,
          type
        );

        switch (type) {
          case 'create':
            mutationDefinition = {
              [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
            };

            break;
          case 'update':
            mutationDefinition = {
              [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
            };

            break;
          case 'delete':
            mutationDefinition = {
              [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
            };
            break;
          default:
          // Nothing.
        }

        // Assign mutation definition to global definition.
        _.merge(acc, {
          mutation: mutationDefinition,
          resolvers: {
            Mutation: {
              [`${mutationName}`]: mutations[type],
            },
          },
        });
      }
    });

    // TODO: Add support for Graphql Aggregation in Bookshelf ORM
    if (model.orm === 'mongoose') {
      // Generation the aggregation for the given model
      const modelAggregator = Aggregator.formatModelConnectionsGQL(
        attributes,
        model,
        name,
        queries.plural,
        plugin
      );
      if (modelAggregator) {
        acc.definition += modelAggregator.type;
        if (!acc.resolvers[modelAggregator.globalId]) {
          acc.resolvers[modelAggregator.globalId] = {};
        }

        _.merge(acc.resolvers, modelAggregator.resolver);
        _.merge(acc.query, modelAggregator.query);
      }
    }

    // Build associations queries.
    _.assign(acc.resolvers[globalId], buildAssocResolvers(model));

    return acc;
  }, initialState);
};

module.exports = {
  buildShadowCRUD,
  buildModel,
};
