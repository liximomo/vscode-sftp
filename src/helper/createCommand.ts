import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';

const workspaceItem = {
  fsPath: vscode.workspace.rootPath,
};

export function createFileCommand(fileTask) {
  return item => {
    // if no file/direcory selected, assume workspace be selected.
    let fileItem = item === undefined ? workspaceItem : item;
    
    if (!fileItem.fsPath) {
      // run through shortcut
      const active = vscode.window.activeTextEditor;
	    if (!active || !active.document) {
        output.onError(new Error('command must run on a file or directory!'));
        return;
      }

      fileItem = {
        fsPath: active.document.fileName
      };
    }
    const activityPath = fileItem.fsPath;
    try {
      const config = getConfig(activityPath);
      fileTask(activityPath, config).catch(output.onError);
    } catch (error) {
      output.onError(error, activityPath);
    }
  };
}
