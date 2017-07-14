import * as vscode from 'vscode';
import * as output from '../modules/output';
import { getPathRelativeWorkspace, getConfig, getAllConfigs } from '../modules/config';
import { upload, download, sync2Remote, sync2Local } from '../modules/sync';
import { createFileCommand, ITarget } from '../helper/createCommand';

// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

const getAllProjects = () =>
  new Promise((resolve, reject) => {
    // getAllProjects
    const configs = getAllConfigs();
    const projectsList = configs
      .map(cfg => ({
        value: cfg.configRoot,
        label: getPathRelativeWorkspace(cfg.configRoot),
        description: cfg.configRoot,
      }))
      .sort((l, r) => l.label.localeCompare(r.label));

    vscode.window
      .showQuickPick(projectsList as vscode.QuickPickItem[], {
        ignoreFocusOut: true,
        placeHolder: 'Select a folder...',
      })
      .then(
        selection =>
          resolve({
            fsPath: (selection as any).value,
          }),
        reject
      );
  });

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

const getTarget = item => {
  if (item === undefined) {
    return getAllProjects();
  }

  if (!item.fsPath) {
    return getActiveTarget();
  }

  return Promise.resolve(item);
};

const getFolderTarget = item => {
  if (item && item.fsPath) {
    return Promise.resolve(item);
  }

  return getAllProjects();
};

export const sync2RemoteCommand = createFileCommand(sync2Remote, getFolderTarget);
export const sync2LocalCommand = createFileCommand(sync2Local, getFolderTarget);

export const uploadCommand = createFileCommand(upload, getTarget);
export const downloadCommand = createFileCommand(download, getTarget);
