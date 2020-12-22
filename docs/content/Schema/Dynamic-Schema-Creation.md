---
title: Dynamic Schema Creation
permalink: /schema/dynamic-schema-creation
category: Data Schema
menuOrder: 2
---

Cube.js allows schemas to be created on-the-fly using a special
[`asyncModule()`][ref-async-module] function only available in the [schema
execution environment][ref-schema-env]. `asyncModule()` allows registering an
async function to be executed at the end of the data schema compile phase so
additional definitions can be added.

[ref-schema-env]: /schema-execution-environment
[ref-async-module]: /schema-execution-environment#asyncmodule

This is often useful in situations where schema properties can be dynamically
updated through an API, for example.

Some example scenarios are below:

<!-- prettier-ignore-start -->
[[warning | Note]]
| Each `asyncModule` call will be invoked only once per schema compilation.
<!-- prettier-ignore-end -->

## Generation

In the following example, we retrieve a JSON object representing all our cubes
using `fetch()` and then use the [`cube()` global function][ref-globals] to
generate schemas from that data:

[ref-globals]:
  https://cube.dev/docs/schema-execution-environment#cube-js-globals-cube-and-others

```javascript
// schema/DynamicSchema.js
const fetch = require('node-fetch');

asyncModule(async () => {
  const dynamicCubes = await (
    await fetch('http://your-api-endpoint/dynamicCubes')
  ).json();

  console.log(dynamicCubes);
  // {
  //    dimensions: {
  //      color: {
  //        sql: `color`,
  //        type: `string`,
  //      },
  //    },
  //    measures: {
  //      price: {
  //        sql: `price`,
  //        type: `number`,
  //      }
  //    },
  //   title: 'DynamicCubeSchema',
  // }

  dynamicCubes.forEach((dynamicCube) => {
    cube(dynamicCube.title, {
      dimensions: dynamicCube.dimensions,
      measures: dynamicCube.measures,
      preAggregations: {
        main: {
          type: `originalSql`,
        },
      },
    });
  });
});
```

## Usage with `schemaVersion`

It is also useful to be able to recompile the schema when there are changes in
the underlying input data. For this purpose, the [`schemaVersion`
][link-config-schema-version] value in the `cube.js` configuration options can
be specified as an asynchronous function:

```javascript
// cube.js
module.exports = {
  schemaVersion: async ({ authInfo }) => {
    const schemaVersions = await (
      await fetch('http://your-api-endpoint/schemaVersion')
    ).json();

    return schemaVersions[authInfo.tenantId];
  },
};
```

[link-config-schema-version]: /config#options-reference-schema-version

## Usage with `COMPILE_CONTEXT`

The `COMPILE_CONTEXT` global object can also be used in conjunction with async
schema creation to allow for multi-tenant deployments of Cube.js.

In an example scenario where all tenants share the same cube, but see different
dimensions and measures, you could do the following:

```javascript
// schema/DynamicSchema.js
const fetch = require('node-fetch');

asyncModule(async () => {
  const {
    authInfo: { tenantId },
  } = COMPILE_CONTEXT;

  const dynamicCubes = await (
    await fetch(`http://your-api-endpoint/dynamicCubes`)
  ).json();

  const allowedDimensions = await (
    await fetch(`http://your-api-endpoint/dynamicDimensions/${tenantId}`)
  ).json();

  const allowedMeasures = await (
    await fetch(`http://your-api-endpoint/dynamicMeasures/${tenantId}`)
  ).json();

  dynamicCubes.forEach((dynamicCube) => {
    cube(dynamicCube.title, {
      title: `${dynamicCube.title}-${tenantId}`,
      dimensions: allowedDimensions,
      measures: allowedMeasures,
      preAggregations: {
        main: {
          type: `originalSql`,
        },
      },
    });
  });
});
```

## Usage with multiple databases

When using multiple databases, you'll need to ensure you set the
[`dataSource`][ref-schema-datasource] property for any asynchronously-created
schemas, as well as ensuring the corresponding database drivers are set up with
[`driverFactory()`][ref-config-driverfactory] in your [`cube.js` configuration
file][ref-config].

[ref-schema-datasource]: https://cube.dev/docs/cube#parameters-data-source
[ref-config-driverfactory]:
  https://cube.dev/docs/config#options-reference-driver-factory
[ref-config]: https://cube.dev/docs/config

For an example scenario where schemas may use either MySQL or Postgres
databases, you could do the following:

```javascript
// schema/DynamicSchema.js
const fetch = require('node-fetch');

asyncModule(async () => {
  const dynamicCubes = await (
    await fetch('http://your-api-endpoint/dynamicCubes')
  ).json();

  dynamicCubes.forEach((dynamicCube) => {
    cube(dynamicCube.title, {
      dataSource: dynamicCube.dataSource,
      dimensions: dynamicCube.dimensions,
      measures: dynamicCube.measures,
      preAggregations: {
        main: {
          type: `originalSql`,
        },
      },
    });
  });
});
```

```javascript
// cube.js
const MySQLDriver = require('@cubejs-backend/mysql-driver');
const PostgresDriver = require('@cubejs-backend/postgres-driver');

module.exports = {
  driverFactory: ({ dataSource }) => {
    if (dataSource === 'mysql') {
      return new MySQLDriver({ database: dataSource });
    }

    return new PostgresDriver({ database: dataSource });
  },
};
```
