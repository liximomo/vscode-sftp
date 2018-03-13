import * as tmp from 'tmp';

export default function makeTmpFile(option): Promise<string> {
  return new Promise((resolve, reject) => {
    tmp.file(
      { ...option, discardDescriptor: true },
      (err, tmpPath) => {
        if (err) reject(err);

        resolve(tmpPath);
      }
    );
  });
}
