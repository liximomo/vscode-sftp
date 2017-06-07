const upath = require('upath');

const path = require('path');
const rpath = path.posix;

function normalize(path) {
  return path.replace(/\\/g, '/');
}

function normalize1(path) {
  return upath.toUnix(path);
}


console.log(rpath.join('/Users/mymomo/sftp-test/', normalize1(path.relative('c:/Users/liximomo/Desktop/test', 'c:\\Users\\liximomo\\Desktop\\test\\a\\b\\c\\a.txt'))));
console.log(upath.join('/Users/mymomo/sftp-test/', normalize(upath.relative('c:/Users/liximomo/Desktop/test', 'c:\\Users\\liximomo\\Desktop\\test\\a\\b\\c\\a.txt'))));
console.log(upath.sep);