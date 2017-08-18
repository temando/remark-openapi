# remark-openapi

[![NPM](https://img.shields.io/npm/v/remark-openapi.svg)](https://npmjs.org/packages/remark-openapi/)
[![Travis CI](https://img.shields.io/travis/temando/remark-openapi.svg)](https://travis-ci.org/temando/remark-openapi)
[![MIT License](https://img.shields.io/github/license/temando/remark-openapi.svg)](https://en.wikipedia.org/wiki/MIT_License)

A [remark](https://github.com/wooorm/remark) plugin that converts a link to a local or remote open api spec into a table with summary of all paths.

## Installation

```sh
$ npm install remark-openapi
```

## Usage

This plugin is to be used with [remark](https://github.com/wooorm/remark), e.g.

```js
var vfile = require('to-vfile');
var remark = require('remark');
var openapi = require('remark-openapi');

var example = vfile.readSync('example.md');

remark()
  .use(openapi)
  .process(example, function (err, file) {
    if (err) throw err;

    console.log(String(file));
  });
```

This plugin does a conversion when the markdown file contains a link to a local open api spec file

```md
[API Reference](../assets/petstore-open-api.json "openapi:")
```

or a remote open api spec file
```md
[API Reference 1](https://temando.github.io/open-api-renderer/petstore-open-api-v3.0.0-RC2.json "openapi:")
```

The above will be converted to the following table:

```md
# swagger link
| Path  | Method | Summary                    |
| ----- | ------ | -------------------------- |
| /pet  | POST   | Add a new pet to the store |
| /pet  | PUT    | Update an existing pet     |
| /user | POST   | Create user                |
```
