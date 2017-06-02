import * as upath from 'upath';

const remotePath = upath;

export default remotePath;

export function normalize(path) {
  return upath.toUnix(path);
}
