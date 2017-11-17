import * as vscode from 'vscode';
import * as path from 'path';
import { DEPRECATED_CONGIF_FILENAME } from '../constants';
import { normalize } from '../modules/remotePath';

export function isDeprecatedConfigFile(fspath: string) {
  const filename = path.basename(fspath);
  return filename === DEPRECATED_CONGIF_FILENAME;
}

export function isNoneRootConfigFile(fspath: string) {
  return !vscode.workspace.workspaceFolders.some(root => normalize(root.uri.fsPath) === fspath);
}
