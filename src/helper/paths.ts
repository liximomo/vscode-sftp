import * as os from 'os';
import * as path from 'path';
import { upath } from '../core';
import { pathRelativeToWorkspace, getWorkspaceFolders } from '../host';

export function simplifyPath(absolutePath: string) {
  return pathRelativeToWorkspace(absolutePath);
}

// FIXME: use fs.pathResolver instead of upath
export function toRemotePath(localPath: string, localContext: string, remoteContext: string) {
  return upath.join(remoteContext, path.relative(localContext, localPath));
}

// FIXME: use fs.pathResolver instead of upath
export function toLocalPath(remotePath: string, remoteContext: string, localContext: string) {
  return path.join(localContext, upath.relative(remoteContext, remotePath));
}

export function isSubpathOf(possiableParentPath: string, pathname: string) {
  return path.normalize(pathname).indexOf(path.normalize(possiableParentPath)) === 0;
}

export function replaceHomePath(pathname: string) {
  return pathname.substr(0, 2) === '~/' ? path.join(os.homedir(), pathname.slice(2)) : pathname;
}

export function resolvePath(from: string, to: string) {
  return path.resolve(from, replaceHomePath(to));
}

export function isInWorkspace(filepath: string) {
  const workspaceFolders = getWorkspaceFolders();
  return (
    workspaceFolders &&
    workspaceFolders.some(
      // vscode can't keep filepath's stable, covert them to toLowerCase before check
      folder => filepath.toLowerCase().indexOf(folder.uri.fsPath.toLowerCase()) === 0
    )
  );
}
