import upath from '../modules/upath';
import * as path from 'path';

export function toRemote(relativePath, remoteContext) {
  return upath.join(remoteContext, relativePath);
}

export function toLocal(relativePath, localContext) {
  return path.join(localContext, relativePath);
}

export function isSubpathOf(subpath, pathname) {
  return path.normalize(pathname).indexOf(path.normalize(subpath)) === 0;
}
