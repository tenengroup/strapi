module.exports = {
  article: {
    attributes: [
      {
        name: 'title',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'content',
        params: {
          appearance: {
            WYSIWYG: true,
          },
          multiple: false,
          type: 'text',
        },
      },
      {
        name: 'author',
        params: {
          nature: 'manyToOne',
          target: 'user',
          pluginValue: 'users-permissions',
          key: 'articles',
          plugin: true,
        },
      },
    ],
    connection: 'default',
    name: 'article',
    description: '',
    collectionName: '',
  },
  tag: {
    attributes: [
      {
        name: 'name',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'articles',
        params: {
          dominant: true,
          nature: 'manyToMany',
          target: 'article',
          key: 'tags',
        },
      },
    ],
    connection: 'default',
    name: 'tag',
    description: '',
    collectionName: '',
  },
  category: {
    attributes: [
      {
        name: 'name',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'articles',
        params: {
          nature: 'oneToMany',
          target: 'article',
          key: 'category',
        },
      },
    ],
    connection: 'default',
    name: 'category',
    description: '',
    collectionName: '',
  },
  reference: {
    attributes: [
      {
        name: 'name',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'article',
        params: {
          target: 'article',
          key: 'reference',
          nature: 'oneToOne',
        },
      },
      {
        name: 'tag',
        params: {
          nature: 'oneWay',
          target: 'tag',
        },
      },
    ],
    connection: 'default',
    name: 'reference',
    description: '',
    collectionName: '',
  },
  product: {
    attributes: [
      {
        name: 'name',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'description',
        params: {
          appearance: {
            WYSIWYG: true,
          },
          multiple: false,
          type: 'text',
        },
      },
      {
        name: 'published',
        params: {
          appearance: {
            WYSIWYG: false,
          },
          multiple: false,
          type: 'boolean',
        },
      },
    ],
    connection: 'default',
    name: 'product',
    description: '',
    collectionName: '',
  },
};
