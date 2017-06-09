const upath = require('upath');

const minimatch = require('minimatch');

Promise.resolve(1)
.then(r => {
  return new Promise((resolve, reject) => {
    reject('error');
  }).catch(err => {
    console.log('err', err);
    return 2;
  });
})
.then(r => console.log('finial:', r));

