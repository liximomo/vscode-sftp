import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';

const workspaceItem: ITarget = {
  fsPath: vscode.workspace.rootPath,
};

export interface ITarget {
  fsPath: string;
}

export function createFileCommand(fileTask, getTarget: (item) => Promise<ITarget[] | ITarget>) {
  const runTask = (target: ITarget) => {
    const activityPath = target.fsPath;
    try {
      const config = getConfig(activityPath);
      fileTask(activityPath, config).catch(output.onError);
    } catch (error) {
      throw new Error(`(${activityPath}) ${error.message}`);
    }
  };
  const runTasks = (target: ITarget[] | ITarget) => [].concat(target).forEach(runTask);

  return item => getTarget(item).then(runTasks).catch(output.onError);
}
