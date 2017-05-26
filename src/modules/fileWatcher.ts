import * as vscode from 'vscode';

import { upload } from './sync';
import { getConfig, fillGlobPattern } from './config';
import { removeRemote } from './sync';
import * as output from './output';

const watchers = {};

function clearWatcher(fileWatcher) {
  fileWatcher.dispose();
}

function setUpWatcher(config) {
  const watchConfig = config.watcher;

  let watcher = watchers[config.configRoot];
  if (watcher) {
    // clear old watcher
    clearWatcher(watcher);
  }
  
  const shouldAddListenser = watchConfig.autoUpload || watchConfig.autoDelete;
  if (watchConfig.files === false || !shouldAddListenser) {
    return;
  }

  const pattern = fillGlobPattern(watchConfig.files, config.configRoot);
  watcher = vscode.workspace.createFileSystemWatcher(pattern, false, true, false);
  watchers[config.configRoot] = watcher;

  if (watchConfig.autoUpload) {
    watcher.onDidCreate(uri => {
      const file = uri.fsPath;
      try {
        const config = getConfig(file);
        upload(file, config, true).catch(output.onError);
      } catch (error) {
        output.onError(error);
      }
    });
  }
  
  if (watchConfig.autoDelete) {
    watcher.onDidDelete(uri => {
      const file = uri.fsPath;
      try {
        const config = getConfig(file);
        removeRemote(config.remotePath, {
          ...config,
          skipDir: true
        }, true).catch(output.onError);
      } catch (error) {
        output.onError(error);
      }
    });
  }
}

let workspaceWatcher = null;

export function onFileChange(cb: (uri: vscode.Uri) => void) {
  if (!workspaceWatcher) {
     workspaceWatcher = vscode.workspace.createFileSystemWatcher(`${vscode.workspace.rootPath}/**`, true, false, true);
  }

  workspaceWatcher.onDidChange(uri => {
    cb(uri);
  });
}

export function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}

export function cleafAllWatcher() {
  if (workspaceWatcher) {
    clearWatcher(workspaceWatcher);
  }
  Object.keys(watchers).forEach(key => clearWatcher(watchers[key]));
}
