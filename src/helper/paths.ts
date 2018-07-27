import * as os from 'os';
import upath from '../core/upath';
import { pathRelativeToWorkspace } from '../host';
import * as path from 'path';

export function simplifyPath(absolutePath) {
  return pathRelativeToWorkspace(absolutePath);
}

export function toRemotePath(relativePath, remoteContext) {
  return upath.join(remoteContext, relativePath);
}

export function toLocalPath(relativePath, localContext) {
  return path.join(localContext, relativePath);
}

export function isSubpathOf(possiableParentPath, pathname) {
  return path.normalize(pathname).indexOf(path.normalize(possiableParentPath)) === 0;
}

export function replaceHomePath(pathname) {
  return pathname.substr(0, 2) === '~/' ? path.join(os.homedir(), pathname.slice(2)) : pathname;
}

export function resolvePath(from, to) {
  return path.resolve(from, replaceHomePath(to));
}
