import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { getWorkspaceFolders } from '../host';

export interface ITarget {
  fsPath: string;
}

export default function createCommand(cmdFn) {
  return async (...args) => {
    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('The SFTP extension requires to work with an opened folder.');
      return;
    }

    try {
      await cmdFn(...args);
    } catch (error) {
      output.onError(error);
    }
  };
}

export function createFileCommand(fileTask, getTarget: (item) => Promise<ITarget[] | ITarget>) {
  const runTask = (target: ITarget) => {
    const activityPath = target.fsPath;
    // todo swallow error from getConfig, so don't interrupt other target
    const config = getConfig(activityPath);
    fileTask(activityPath, config).catch(output.onError);
  };
  const runTasks = (target: ITarget[] | ITarget) => [].concat(target).forEach(runTask);

  const cmdFn = async item => {
    const target = await getTarget(item);
    if (!target) {
      return;
    }

    runTasks(target);
  };

  return createCommand(cmdFn);
}
