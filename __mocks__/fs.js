const { fs } = require('memfs');

fs.__mock__ = true;
module.exports = fs;
