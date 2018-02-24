import * as vscode from 'vscode';
import { upload, download, sync2Remote, sync2Local } from '../modules/sync';
import { createFileCommand } from '../helper/createCommand';
import { selectContext } from '../helper/select';

const getActiveTarget = () =>
  new Promise((resolve, reject) => {
    const active = vscode.window.activeTextEditor;
    if (!active || !active.document) {
      throw new Error('Action must have a file or directory as target!');
    }

    resolve({
      fsPath: active.document.fileName,
    });
  });

const getTarget = (item, items) => {
  // command palette
  if (item === undefined) {
    return selectContext().then(path => ({ fsPath: path }));
  }

  // short cut
  if (!item.fsPath) {
    return getActiveTarget();
  }

  return Promise.resolve(items ? items : item);
};

const getFolderTarget = (item, items) => {
  // context menu
  if (item && item.fsPath) {
    return Promise.resolve(items ? items : item);
  }

  return selectContext().then(path => ({ fsPath: path }));
};

export const sync2RemoteCommand = createFileCommand(sync2Remote, getFolderTarget);
export const sync2LocalCommand = createFileCommand(sync2Local, getFolderTarget);

export const uploadCommand = createFileCommand(upload, getTarget);
export const downloadCommand = createFileCommand(download, getTarget);
