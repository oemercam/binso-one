const { sep } = require('node:path');
const { globSync: findPaths } = require('glob');
const { Minimatch } = require('minimatch');

function isDynamicPattern(pattern) {
  return new Minimatch(pattern, { magicalBraces: true }).hasMagic();
}

// Both ESLint consumers use this for TypeScript project paths and source files.
function globSync(patterns, { absolute = false, cwd, dot = false, ignore = [] } = {}) {
  return findPaths(patterns, { absolute, cwd, dot, ignore, nodir: true })
    .map(file => file.split(sep).join('/'));
}

module.exports = { globSync, isDynamicPattern };
