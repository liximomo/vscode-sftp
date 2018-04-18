const Benchmark = require('benchmark');
const { transfer } = require('../out/src/modules/fileTransferTask');
const mockFs = require('mock-fs');
const localFs = require('../out/src/modules/localFs').default;

const fakeDir = {
  'some-file.txt': 'file content here',
  'empty-dir': {
    /** empty directory */
  },
};

const fakeDirs = {};
for (let index = 0; index < 30; index++) {
  fakeDirs['a' + index] = fakeDir;
}
mockFs({
  '/local1': fakeDirs,
  '/local2': fakeDirs,
  '/local3': fakeDirs,
});

const suite = new Benchmark.Suite({
  defer: true,
  async: true,
});

const src1 = '/local1';
const src2 = '/local2';
const src3 = '/local3';
const target1 = '/target1';
const target2 = '/target2';
const target3 = '/target3';

function onProgress(error, task) {
  if (error) {
    console.error(error, `${task.type} ${task.file.fsPath}`);
  }
  // console.error(`${task.type} ${task.file.fsPath}`);
}

(async () => {
  suite
    .add('no concurrency', {
      defer: true,
      fn: async deferred => {
        await transfer(src1, target1, localFs, localFs, {
          concurrency: 1,
          perserveTargetMode: false,
          onProgress,
        });
        deferred.resolve();
      },
    })
    .add('256 concurrency', {
      defer: true,
      fn: async deferred => {
        await transfer(src2, target2, localFs, localFs, {
          concurrency: 256,
          perserveTargetMode: false,
          onProgress,
        });
        deferred.resolve();
      },
    })
    .add('512 concurrency', {
      defer: true,
      fn: async deferred => {
        await transfer(src3, target3, localFs, localFs, {
          concurrency: 512,
          perserveTargetMode: false,
          onProgress,
        });
        deferred.resolve();
      },
    })
    .on('error', error => {
      console.log(error);
    })
    .on('cycle', event => {
      console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({
      async: true,
    });
})();
