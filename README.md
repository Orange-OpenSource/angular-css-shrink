[//]: # 'SPDX-FileCopyrightText: 2021 Orange SA'
[//]: # 'SPDX-License-Identifier: MIT'

<p align="center">
    <img src="https://boosted.orange.com/docs/4.6/assets/brand/orange_logo.svg" alt="Orange logo" width="50" height="50">
</p>

<h3 align="center">Angular Css Shrink</h3>

A Post analyse script to automatically reduce the size of css for angular App (maybe should work with other frameworks too)

## Table of contents

- [Prerequist](#Prerequist)
- [Installation](#Installation)
- [Usage](#Usage)
- [Copyright and license](#copyright-and-license)

## Prerequist

NodeJs > 12.19.0

- Has been tested on Angular 10 and 11
- Has been tested with bootstrap, ng-bootstrap, boosted, ng\*boosted, angular material

Extra js and css file used in your angular project should be declared in your angular json file to be in the compiler scope.
Css files declared in index.html are not taken into account

angular.json

```json
           ...
           "styles": [
              "./src/styles.scss",
              "node_modules/boosted/scss/boosted.scss",
              "./icons/retailers-v1.0/style.css",
              "node_modules/boosted/dist/css/orangeHelvetica.css",
              "node_modules/ng-boosted/style/ng-boosted.scss"
            ],
            "scripts": []
            ...

```

## Installation

### step 1 : install the plugin

```bash
npm install -d angular-css-shrink
```

### Step 2 : create a webpack config file at the root of your project (or update )

extra-webpack.config.js :

```javascript
var AngularCssShrink = require('angular-css-shrink');

module.exports = {
  plugins: [new AngularCssShrink({ debug: false })]
};
```

### Step3 : Update your angular.json

To use extra webpack plugin use @angular-builders instead of @angular-devkit and add customWebpackConfig option to configure the webpack config js file

replace

```json
"architect": {
        "build": {
            "builder": "@angular-devkit/build-angular:browser",
            "options": {
            "aot": true,
            "outputPath": "dist/myDummyProject",
            "index": "src/index.html",
```

with

```json
"architect": {
    "build": {
          "builder": "@angular-builders/custom-webpack:browser",
           "options": {
            "customWebpackConfig": {
              "path": "./extra-webpack.config.js"
            },
            "aot": true,
            "outputPath": "dist/myDummyProject",
            "index": "src/index.html",
```

To run angular css shrink on ng serve

replace

```json
     "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
```

with

```json
   "serve": {
          "builder": "@angular-builders/custom-webpack:dev-server",
```

## Usage

run your regular ng serve or ng build command, css is now automatically shrinked

## Copyright and license

Angular Css Shrink code and documentation copyright 2021 the Angular Css Shrink Authors and [Orange SA](https://orange.com). Code released under the MIT License.
