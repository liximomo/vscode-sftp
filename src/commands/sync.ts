import * as vscode from 'vscode';
import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { upload, download, sync2Remote, sync2Local } from '../modules/sync';
import { createFileCommand } from '../helper/createCommand';

// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

const getCurrentActiveTarget = item => new Promise((resolve, reject) => {
  let fileItem = item;

  if (!fileItem.fsPath) {
    // run through shortcut
    const active = vscode.window.activeTextEditor;
    if (!active || !active.document) {
      reject(new Error('Action must have a file or directory as target!'));
      return;
    }

    fileItem = {
      fsPath: active.document.fileName,
    };
  }

  resolve(fileItem);
});

const getAllOpenFiles = item => new Promise((resolve, reject) => {
  // output.debug(vscode.window.visibleTextEditors.map(editors => editors.document));
  output.debug('visibleTextEditors', vscode.window.visibleTextEditors.length);
  output.debug('known textDocuments', vscode.workspace.textDocuments.length);
  resolve(item);
});

export const sync2RemoteCommand = createFileCommand(sync2Remote, getCurrentActiveTarget);
export const sync2LocalCommand = createFileCommand(sync2Local, getCurrentActiveTarget);

export const uploadCommand = createFileCommand(upload, getCurrentActiveTarget);
export const downloadCommand = createFileCommand(download, getCurrentActiveTarget);
