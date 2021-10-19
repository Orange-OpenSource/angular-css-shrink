// SPDX-FileCopyrightText: 2021 Orange SA
// SPDX-License-Identifier: MIT
/*
 * #%L
 * Angular css shrink
 *
 * Module name: angular-css-shrink
 * Version:     0.1-BETA
 * Created:     2021-03-01 by Julien Faure
 * %%
 * Copyright (C) 2021 Orange
 * %%
 * The license and distribution terms in 'MIT' for this file may be found
 * at http://spdx.org/licenses/MIT  .
 * #L%
 */

var fs = require('fs');
var esprima = require('esprima');
var cssParser = require('css');
const { RawSource, SourceMapSource } = require('webpack-sources');

class AngularCssShrink {
  constructor(options) {
    this.logger = {};
    this.options = {};
    this.options.debug = options && options.debug ? options.debug : false;
    this.options.regExp = options && options.regExp ? options.regExp : new RegExp(/[^a-zA-Z0-9_\-]/g);
    this.options.minClassLength = options && options.minClassLength ? options.minClassLength : 1;
  }

  /**
   * Function to check if the class should be keeped or not
   * @date 2021-03-24
   * @param {any} selectors input from css parsing
   * @param {MAp<String>} angularClasses map with all detected classes in js
   * @returns {boolean}
   */
  keepIt(selectors, angularClasses) {
    if (selectors[0][0] != '.') {
      // its not a class keep the input
      return true;
    }
    // transform the selector to isolate class name (after between the . and othe char)
    let selectorsClean = [];
    selectors.forEach((className) => {
      if (className[0] === '.') {
        className = className.slice(1);
      }
      className = className.replace(this.options.regExp, ' ');
      if (className.indexOf(' ') > -1) {
        className = className.split(' ')[0];
      }
      if (className != '') {
        selectorsClean.push(className);
      }
    });
    let found = false;
    selectorsClean.forEach((sc) => {
      if (angularClasses.has(sc)) {
        found = true;
      }
    });
    return found;
  }

  /**
   * Extact all class from js files by parsing all String tokens
   * @date 2021-03-24
   * @param {Array<String>} jsCodes array of js code stringt
   * @returns {Map<String>}
   */
  extractAngularClass(jsCodes) {
    let jscode = jsCodes.join(' ');

    let classList = new Map();
    const code = esprima.tokenize(jscode);
    const clist = code.filter((t) => t.type == 'String').map((t) => t.value);
    console.log(clist.length);

    clist.forEach((c) => {
      c = c.substring(1, c.length - 1);
      c = c.trim();
      // replace all special char by space (class should contain olny char, number _ and - )
      c = c.replace(this.options.regExp, ' ');
      if (c.indexOf(' ') > -1) {
        const spacedClist = c.split(' ').filter((ex) => ex != '');
        spacedClist.forEach((c) => {
          if (classList.has(c) === false && c.length > this.options.minClassLength) {
            classList.set(c, true);
          }
        });
      } else {
        if (c.length > this.options.minClassLength) {
          if (classList.has(c) === false) {
            classList.set(c, true);
          }
        }
      }
    });
    return classList;
  }

  /**
   * filter css files with classes
   * @date 2021-03-24
   * @param {Map<String>} angularClasses List of angular classes to keep
   * @param {String} cssraw Css file
   * @param {any} logger
   * @returns {String} CSS code
   */
  angularCssShrink(angularClasses, cssraw, logger) {
    logger.log('\n num of angular classes', angularClasses.size);

    let filterMedia = true;

    // parse css
    var ast = cssParser.parse(cssraw);

    ast.stylesheet.rules = ast.stylesheet.rules.filter((node) => {
      if (node.type == 'rule') {
        return this.keepIt(node.selectors, angularClasses);
      } else {
        if (filterMedia) {
          if (node.type == 'media') {
            let media_rules = node.rules;
            media_rules = media_rules.filter((subnode) => {
              if (subnode.type == 'rule') {
                return this.keepIt(subnode.selectors, angularClasses);
              } else {
                return true;
              }
            });
            node.rules = media_rules;
            return true;
          } else {
            return true;
          }
        } else {
          return true;
        }
      }
    });

    var result = cssParser.stringify(ast, { compress: true });

    logger.info(
      'before :',
      cssraw.length,
      'after:',
      result.length,
      'gain: ',
      ((cssraw.length - result.length) / (cssraw.length + 0.0001)) * 100,
      '%'
    );
    return result;
  }

  /**
   * extact code (css or js) from compilation process
   * @date 2021-03-24
   * @param {any} compilation webpack compilation object
   * @param {any} name file name
   * @returns {any}
   */
  getAsset(compilation, name) {
    // New API
    if (compilation.getAsset) {
      return compilation.getAsset(name);
    }

    if (compilation.assets[name]) {
      return { name, source: compilation.assets[name], info: {} };
    }
  }

  /**
   * Main otimization process
   * @date 2021-03-24
   * @param {any} webpack compilation object
   * @param {Array<String>} jsAssets array of js files
   * @param {any} cssAssests array of css files
   * @param {any} logger
   * @returns {void}
   */
  optimize(compilation, logger) {
    let jsAssets = [];
    let cssAssets = [];
    const emittedAssets = compilation.getAssets().map((a) => a.name);
    emittedAssets.forEach((emiA) => {
      if (emiA.endsWith('js')) {
        try {
          const { source: inputSource } = this.getAsset(compilation, emiA);
          jsAssets.push(inputSource.source());
        } catch (error) {
          logger.warn('Can not collect js assets ', emiA, error.message);
        }
      }
      if (emiA.endsWith('css')) {
        cssAssets.push(emiA);
      }
    });
    if (this.options.debug) {
      fs.writeFile('css-shrink-debug-alljs.js', jsAssets.join(''), (err) => {
        if (err) throw err;
      });
      logger.log('Saved!');
    }

    const classlist = this.extractAngularClass(jsAssets, logger);
    logger.info('Founded ' + classlist.size + ' potential classes');

    if (this.options.debug) {
      logger.log('write css-shrink-debug-classlist.txt');
      fs.writeFile('css-shrink-debug-classlist.txt', [...classlist.keys()].join('\n'), function (err) {
        if (err) throw err;
      });
    }

    cssAssets.forEach((name) => {
      logger.info('Shrink ' + name);

      const { source: inputSource, info } = this.getAsset(compilation, name);
      let output = {};
      let input;
      let inputSourceMap;
      if (inputSource.sourceAndMap) {
        const { source, map } = inputSource.sourceAndMap();
        input = source;
        if (map) {
          inputSourceMap = map;
        }
      } else {
        input = inputSource.source();
        inputSourceMap = null;
      }

      if (this.options.debug) {
        logger.info('write css-shrink-debug-original.css');
        fs.writeFile('css-shrink-debug-original.css', input, function (err) {
          if (err) throw err;
        });
      }

      let code = this.angularCssShrink(classlist, input, logger);

      output = {
        code: code,
        map: null,
        warnings: []
      };
      if (output.map) {
        output.source = new SourceMapSource(output.code, name, output.map, input, inputSourceMap, true);
      } else {
        output.source = new RawSource(output.code);
      }
      const newInfo = { ...info, minimized: true };
      const { source } = output;
      compilation.updateAsset(name, source, newInfo);
    });
  }

  /**
   * Collect compiled and optimized js and css files and store them in table
   * @date 2021-03-24
   * @param {any} compilation webPack compilation object
   * @param {any} name name of the compiled asset
   * @param {Array<String>} jsAssets
   * @param {Array<String>} cssAssest
   * @param {any} logger
   * @returns {any}
   */
  async collect(compilation, name, jsAssets, cssAssest, logger) {
    logger.info('Detect ', name);
    if (name.endsWith('.js')) {
      logger.log('Detect ', name);
      try {
        const { source: inputSource } = this.getAsset(compilation, name);
        jsAssets.push(inputSource.source());
      } catch (error) {
        logger.warn('Can not collect js assets ', name, error.message);
      }
    }
    if (name.endsWith('.css')) {
      logger.log('Detect ', name);
      try {
        cssAssest.push(name);
      } catch (error) {
        logger.warn('Can not collect css assets ', name);
      }
    }
  }

  /**
   * Main webpackcall
   * @date 2021-03-24
   * @param {any} compiler webpack compiler
   * @returns {void}
   */
  apply(compiler) {
    const pluginName = this.constructor.name;

    const logger = compiler.getInfrastructureLogger(pluginName);
    logger.log('Starting process');
    compiler.hooks.emit.tap(pluginName, (compilation) => {
      this.optimize(compilation, logger);
    });
  }
}

module.exports = AngularCssShrink;
