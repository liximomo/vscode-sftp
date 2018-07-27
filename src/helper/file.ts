import * as path from 'path';
import * as tmp from 'tmp';
import * as vscode from 'vscode';
import { CONGIF_FILENAME } from '../constants';
import upath from '../core/upath';

export function isValidFile(uri: vscode.Uri) {
  return uri.scheme === 'file';
}

export function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME;
}

export function fileDepth(file: string) {
  return upath.normalize(file).split('/').length;
}

export function makeTmpFile(option): Promise<string> {
  return new Promise((resolve, reject) => {
    tmp.file({ ...option, discardDescriptor: true }, (err, tmpPath) => {
      if (err) reject(err);

      resolve(tmpPath);
    });
  });
}
