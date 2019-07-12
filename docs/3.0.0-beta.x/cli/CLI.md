# Command Line Interface (CLI)

Strapi comes with a full featured Command Line Interface (CLI) which lets you scaffold and manage your project in seconds.

---

## strapi new

Create a new project.

```bash
strapi new <name>

options: [--debug|--quickstart|--dbclient=<dbclient> --dbhost=<dbhost> --dbport=<dbport> --dbname=<dbname> --dbusername=<dbusername> --dbpassword=<dbpassword> --dbssl=<dbssl> --dbauth=<dbauth> --dbforce]
```

- **strapi new &#60;name&#62;**<br/>
  Generates a new project called **&#60;name&#62;** and installs the default plugins through the npm registry.

- **strapi new &#60;name&#62; --debug**<br/>
  Will display the full error message if one is fired during the database connection.

- **strapi new &#60;name&#62; --quickstart**<br/>
  Use the quickstart system to create your app.

- **strapi new &#60;name&#62; --dbclient=&#60;dbclient&#62; --dbhost=&#60;dbhost&#62; --dbport=&#60;dbport&#62; --dbname=&#60;dbname&#62; --dbusername=&#60;dbusername&#62; --dbpassword=&#60;dbpassword&#62; --dbssl=&#60;dbssl&#62; --dbauth=&#60;dbauth&#62; --dbforce**<br/>

  Generates a new project called **&#60;name&#62;** and skip the interactive database configuration and initialize with these options.

  - **&#60;dbclient&#62;** can be `mongo`, `postgres`, `mysql`.
  - **&#60;dbssl&#62;** and **&#60;dbauth&#62;** are available only for `mongo` and are optional.
  - **--dbforce** Allows you to overwrite content if the provided database is not empty. Only available for `postgres`, `mysql`, and is optional.

## strapi develop|dev

Start a Strapi application with autoReload enabled.

Strapi modifies/creates files at runtime and needs to restart when new files are created. To achieve this, `strapi develop` adds a file watcher and restarts the application when necessary.

::: note
You should never use this command to run a Strapi application in production.
:::

## strapi start

Start a Strapi application with autoReload disabled.

This commands is there to run a Strapi application without restarts and file writes (aimed at production usage).
Certain features are disabled in the `strapi start` mode because they require application restarts.

::: note
You can specify a NODE_ENV to use the configurations in the `./config/environments/[development|staging|production]` folder.
By default the `development` environment will be used.
:::

## strapi build

Builds your admin panel.

::: note
You can specify a NODE_ENV to use the configurations in the `./config/environments/[development|staging|production]` folder.
By default the `development` environment will be used.
:::

## strapi generate:api

Scaffold a complete API with its configurations, controller, model and service.

```bash
strapi generate:api <name> [<attribute:type>]

options: [--tpl <name>|--plugin <name>]
```

- **strapi generate:api &#60;name&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project.

- **strapi generate:api &#60;name&#62; &#60;attribute:type&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project. The model will already contain an attribute called **&#60;attribute&#62;** with the type property set to **&#60;type&#62;**.

  Example: `strapi generate:api product name:string description:text price:integer`

- **strapi generate:api &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./plugins/<plugin>` folder.

  Example: `strapi generate:api product --plugin content-manager`

- **strapi generate:api &#60;name&#62; --tpl &#60;template&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder which works with the given **&#60;template&#62;**. By default, the generated APIs are based on Mongoose.

  Example: `strapi generate:api product --tpl bookshelf`

::: note
The first letter of the filename will be uppercase.
:::

## strapi generate:controller

Create a new controller.

```bash
strapi generate:controller <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:controller &#60;name&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./api/<name>/controllers` folder.

  Example: `strapi generate:controller category` will create the controller at `./api/category/controllers/Category.js`.

- **strapi generate:controller &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./api/<api>/controllers` folder.

  Example: `strapi generate:controller category --api product` will create the controller at `./api/product/controllers/Category.js`.

- **strapi generate:controller &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./plugins/<plugin>/controllers` folder.

::: note
The first letter of the filename will be uppercase.
:::

## strapi generate:model

Create a new model.

```bash
strapi generate:model <name> [<attribute:type>]

options: [--api <name>|--plugin <name>]
```

- **strapi generate:model &#60;name&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<name>/models` folder. It will create two files.
  The first one will be **&#60;name&#62;.js** which contains your lifecycle callbacks and another **&#60;name&#62;.settings.json** that will list your attributes and options.

  Example: `strapi generate:model category` will create these two files `./api/category/models/Category.js` and `./api/category/models/Category.settings.json`.

- **strapi generate:model &#60;name&#62; &#60;attribute:type&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<name>/models` folder. The file **&#60;name&#62;.settings.json** will already contain a list of attribute with their associated **&#60;type&#62;**.

  Example: `strapi generate:model category name:string description:text` will create these two files `./api/category/models/Category.js` and `./api/category/models/Category.settings.json`. This last file will contain two attributes `name` with the type `string` and `description` with type `text`.

- **strapi generate:model &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<api>/models` folder.

  Example: `strapi generate:model category --api product` will create these two files:

  - `./api/product/models/Category.js`
  - `./api/product/models/Category.settings.json`.

* **strapi generate:model &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./plugins/<plugin>/models` folder.

::: note
The first letter of the filename will be uppercase.
:::

## strapi generate:service

Create a new service.

```bash
strapi generate:service <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:service &#60;name&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./api/<name>/services` folder.

  Example: `strapi generate:service category` will create the service at `./api/category/services/Category.js`.

- **strapi generate:service &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./api/<api>/services` folder.

  Example: `strapi generate:service category --api product` will create the service at `./api/product/services/Category.js`.

- **strapi generate:service &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./plugins/<plugin>/services` folder.

::: note
The first letter of the filename will be uppercase.
:::

## strapi generate:policy

Create a new policy.

```bash
strapi generate:policy <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:policy &#60;name&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./config/policies` folder.

  Example: `strapi generate:policy isAuthenticated` will create the policy at `./config/policies/isAuthenticated.js`.

- **strapi generate:policy &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./api/<api>/config/policies` folder. This policy will be scoped and only accessible by the **&#60;api&#62;** routes.

  Example: `strapi generate:policy isAuthenticated --api product` will create the policy at `./api/product/config/policies/isAuthenticated.js`.

- **strapi generate:policy &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./plugins/<plugin>/config/policies` folder. This policy will be scoped and accessible only by the **&#60;plugin&#62;** routes.

## strapi generate:plugin

Create a new plugin skeleton.

```bash
strapi generate:plugin <name>
```

- **strapi generate:plugin &#60;name&#62;**<br/>
  Generates an empty plugin called **&#60;name&#62;** in the `./plugins` folder.

  Example: `strapi generate:plugin user` will create the plugin at `./plugins/user`.

Please refer to the [local plugins](../plugin-development/quick-start.md) section to know more.

---

## strapi install

Install a plugin in the project.

```bash
strapi install <name>
```

- **strapi install &#60;name&#62;**<br/>
  Installs a plugin called **&#60;name&#62;**.

  Example: `strapi install graphql` will install the plugin `strapi-plugin-graphql`

::: warning
Some plugins have admin panel integrations, your admin panel might have to be rebuilt. This can take some time.
:::

---

## strapi uninstall

Uninstall a plugin from the project.

```bash
strapi uninstall <name>

options [--delete-files]
```

- **strapi uninstall &#60;name&#62;**<br/>
  Uninstalls a plugin called **&#60;name&#62;**.

  Example: `strapi uninstall graphql` will remove the plugin `strapi-plugin-graphql`

- **strapi uninstall &#60;name&#62; --delete-files**<br/>
  Uninstalls a plugin called **&#60;name&#62;** and removes the files in `./extensions/name/`

  Example: `strapi uninstall graphql` will remove the plugin `strapi-plugin-graphql` and all the files in `./extensions/graphql`

::: warning
Some plugins have admin panel integrations, your admin panel might have to be rebuilt. This can take some time.
:::

---

## strapi version

Print the current globally installed Strapi version.

```bash
strapi version
```

---

## strapi help

List CLI commands.

```
strapi help
```
