import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { getWorkspaceFolders, refreshExplorer } from '../host';

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

export function createFileCommand(fileTask, getTarget: (item, items?) => Promise<ITarget[] | ITarget>) {
  const runTask = (target: ITarget) => {
    const activityPath = target.fsPath;
    // todo swallow error from getConfig, so don't interrupt other target
    const config = getConfig(activityPath,true);
    return fileTask(activityPath, config).catch(output.onError).then(refreshExplorer);
  };

  const cmdFn = async (item, items) => {
    const target = await getTarget(item, items);
    if (!target) {
      return;
    }

    const pendingTasks = [].concat(target).map(runTask);
    return await Promise.all(pendingTasks);
  };

  return createCommand(cmdFn);
}
