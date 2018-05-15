import * as vscode from 'vscode';
import * as path from 'path';
import { CONGIF_FILENAME } from '../constants';

export function isValidFile(uri: vscode.Uri) {
  return uri.scheme === 'file';
}

export function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME;
}
