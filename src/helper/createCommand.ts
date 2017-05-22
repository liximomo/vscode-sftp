import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { WORKSPACE_TRIE_TOKEN } from '../constants';

const workspaceItem = {
  fsPath: vscode.workspace.rootPath,
};

export function createFileCommand(fileTask) {
  return item => {
    // if no file/direcory selected, assume workspace be selected.
    const fileItem = item === undefined ? workspaceItem : item;

    if (!(fileItem && fileItem.fsPath)) {
      output.onError(new Error('command must run on a file or directory!'));
      return;
    }

    const activityPath = fileItem.fsPath;
    try {
      const config = getConfig(activityPath);
      fileTask(activityPath, config).catch(output.onError);
    } catch (error) {
      output.onError(error);
    }
  };
}
