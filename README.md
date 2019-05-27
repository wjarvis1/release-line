# `@wrhs/release-line`

[![Version npm](https://img.shields.io/npm/v/@wrhs/release-line.svg?style=flat-square)](https://www.npmjs.com/package/@wrhs/release-line)
[![License](https://img.shields.io/npm/l/@wrhs/release-line.svg?style=flat-square)](https://github.com/warehouseai/release-line/blob/master/LICENSE)
[![npm Downloads](https://img.shields.io/npm/dm/@wrhs/release-line.svg?style=flat-square)](https://npmcharts.com/compare/@wrhs/release-line?minimal=true)
[![Build Status](https://travis-ci.com/warehouseai/release-line.svg?branch=master)](https://travis-ci.com/warehouseai/release-line)
[![Dependencies](https://img.shields.io/david/warehouseai/release-line.svg?style=flat-square)](https://github.com/warehouseai/release-line/blob/master/package.json)

A thin wrapper around the `release-line` models in
[`warehouse-models`][warehouse-models] to enable properly compiling the
`release-line` data structure.

## Install

```bash
npm install @wrhs/release-line --save
```

## Usage

The intended usage is for providing some higher level operations on top of the
`release-line` related models in [`warehouse-models`][warehouse-models]
```js

const thenify = require('tinythen');
const Datastar = require('datastar');
const wrhsModels = require('warehouse-models');
const cassConfig = require('./config')
const ReleaseLine = require('@wrhs/release-line');

function async main() {
  const datastar = new Datastar(cassConfig);
  const models = wrhsModels(datastar);
  const release = new ReleaseLine({ models });

  await thenify(datastar, 'connect');

  await release.create({ version: '4.0.0', pkg: 'releaseline-test' });
}

main()

```

## What is a `release-line`?

This concept is meant to encapsulate a root package and the packages that
depend at specific versions that were built together in order to be able to
consistently promote them as a group between environments. For the
[`warehouse.ai`][warehouse.ai] system this is meant to ensure that your package
and its dependents that were built in DEV at whatever versions will be
correctly promoted through environments without mistakenly getting an updated
version of a dependent package.

## Test

Ensure you have [cassandra] running locally first. You can follow
[this guide][install-cassandra] to install it on OSX. It should be similar
for other operating systems as well.

```bash
npm test
```

[cassandra]: https://cassandra.apache.org/
[install-cassandra]: https://medium.com/@areeves9/cassandras-gossip-on-os-x-single-node-installation-of-apache-cassandra-on-mac-634e6729fad6
[warehouse-models]: https://github.com/warehouseai/warehouse-models
[warehouse.ai]: htttps://github.com/godaddy/warehouse.ai

