import * as upath from 'upath';
import * as path from 'path';
import remotePath from '../modules/remotePath';

export const sep = path.posix.sep;

export function join(rootPath, pattern) {
  return upath.join(rootPath, pattern);
}

export function normalize(path) {
  return upath.toUnix(path);
}

export function relativeWithLocal(from, target) {
  return path.relative(from, target);
}

export function relativeWithRemote(from, target) {
  return remotePath.relative(from, target);
}
