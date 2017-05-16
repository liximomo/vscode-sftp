import * as path from 'path';

const remotePath = path.posix;

export default remotePath;

export function normalize(path) {
  return path.replace(/\\/g, '/');
}
