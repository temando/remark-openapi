import visit from 'unist-util-visit';
import 'isomorphic-fetch';
import u from 'unist-builder';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import isUrl from 'is-url';

const PLUGIN_NAME = 'remark-openapi';

/**
 * Fetch the contents of a remote or local swagger spec file
 *
 * @param {string} specLink
 * @param {string} sourceDir
 *
 * @return {Promise<Object>}
 */
async function fetchSpec(specLink, sourceDir) {
  try {
    let contents;

    if (isUrl(specLink)) {
      // Remote spec
      const response = await fetch(specLink);
      contents = await response.text();
    } else {
      // Local spec
      contents = fs.readFileSync(`${sourceDir}/${specLink}`, 'utf8');
    }

    return contents;
  } catch (error) {
    throw new Error(`Failed fetching file at ${specLink}. Details: ${error}`);
  }
}

/**
 * Construct remark table object from swagger spec
 *
 * @param {Object} spec
 *
 * @return {Object}
 */
function createTable(spec) {
  const tableHead = u('tableHeader', [
    u('tableCell', [u('text', 'Path')]),
    u('tableCell', [u('text', 'Method')]),
    u('tableCell', [u('text', 'Summary')]),
  ]);

  // convert swagger to table rows
  const tableRows = Object.keys(spec.paths).reduce((arr, path) => {
    const methods = spec.paths[path];

    Object.keys(methods).forEach((method) => {
      const summary = spec.paths[path][method].summary || '[ not available ]';
      arr.push(u('tableRow', [
        u('tableCell', [u('text', path)]),
        u('tableCell', [u('text', method.toUpperCase())]),
        u('tableCell', [u('text', summary)]),
      ]));
    });

    return arr;
  }, []);

  return u('table', [tableHead].concat(tableRows));
}

/**
 * Process swaggerItem
 *
 * @param {Object} swaggerItem
 * @param {Object} vfile
 *
 * @return {Promise}
 */
async function processSwaggerItem(swaggerItem, vfile) {
  const { url, node, index, parent } = swaggerItem;

  try {
    const body = await fetchSpec(url, vfile.dirname);
    const spec = yaml.safeLoad(body);
    const table = createTable(spec);
    parent.children.splice(index, 1, table);
    vfile.info('swagger link replaced with swagger table', node.position, PLUGIN_NAME);
  } catch (error) {
    vfile.message(`Failed processing spec file at ${url}. Details: ${error}`, node.position, PLUGIN_NAME);
  }

  return swaggerItem;
}

/**
 * If links have a title attribute `openapi:` or `swagger:`,
 * then get the contents of the spec file and construct a table and replace link with table.
 *
 * @param {object} ast
 * @param {object} vfile
 * @return {Promise}
 */
function visitLink(ast, vfile) {
  const swaggerItems = [];

  visit(ast, 'link', (node, index, parent) => {
    if (node.title === 'swagger:' || node.title === 'openapi:') {
      const swaggerItem = {
        url: node.url,
        node,
        index,
        parent,
      };

      swaggerItems.push(swaggerItem);

      // Add deprecation message
      if (node.title === 'swagger:') {
        vfile.info('`swagger` is deprecated. Please use `openapi` instead.', node.position, PLUGIN_NAME);
      }
    }
  });

  if (!swaggerItems.length) {
    return Promise.resolve(ast);
  }

  return Promise.all(swaggerItems.map(swaggerItem => processSwaggerItem(swaggerItem, vfile)));
}

/**
 * Export the attacher which accepts options and returns the transformer to
 * act on the MDAST tree, given a VFile.
 *
 * @link https://github.com/unifiedjs/unified#function-attacheroptions
 * @return {function}
 */
export default function openapi() {
  /**
   * @link https://github.com/unifiedjs/unified#function-transformernode-file-next
   * @link https://github.com/syntax-tree/mdast
   * @link https://github.com/vfile/vfile
   * @param {object} ast MDAST
   * @param {object} vFile
   * @param {function} next
   * @return {object}
   */
  return async function transformer(ast, vFile) {
    await visitLink(ast, vFile);

    return ast;
  };
}
