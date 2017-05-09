import * as fs from 'fs';
import * as path from 'path';

export function fileStat(file): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stat);
    });
  });
}

export function list(dir): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const fileStatus = files.map(file => {
        const fspath = path.join(dir, file);
        return fileStat(fspath)
          .then(stat => ({
            name: file,
            fspath: fspath,
            isDirectory: stat.isDirectory(),
          }));
      });

      resolve(Promise.all(fileStatus));
    });
  });
}


