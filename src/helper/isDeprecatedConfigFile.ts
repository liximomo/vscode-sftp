import * as vscode from 'vscode';
import * as path from 'path';
import { DEPRECATED_CONGIF_FILENAME } from '../constants';

export default function isConfigFile(fspath: string) {
  const filename = path.basename(fspath);
  return filename === DEPRECATED_CONGIF_FILENAME;
}
