import * as vscode from 'vscode';

import { isValidFile } from '../helper/documentFilter';
import { upload } from './sync';
import { getConfig, fillGlobPattern } from './config';
import { removeRemote } from './sync';
import * as output from './output';

const watchers = {};
const uploadQueue = [];
const deleteQueue = [];

const PROCESS__DALEY = 300;

function fileError(event, file, showErrorWindow = true) {
  return error =>  {
    output.error(`${event} ${file}`, '\n', error.stack);
    if (showErrorWindow) {
      output.showOutPutChannel();
    }
  };
}

function doUpload() {
  const files = uploadQueue.slice().map(uri => uri.fsPath).sort();
  uploadQueue.length = 0;
  files.forEach(file => {
    let config;
    try {
      config = getConfig(file);
    } catch (error) {
      output.onError(error);
      return;
    }

    upload(file, config, true).catch(fileError('upload', file));
  });
}

function doDelete() {
  const files = deleteQueue.slice().map(uri => uri.fsPath).sort();
  deleteQueue.length = 0;
  let config;
  files.forEach(file => {
    try {
      config = getConfig(file);
    } catch (error) {
      output.onError(error);
      return;
    }

    removeRemote(config.remotePath, {
      ...config,
      skipDir: true,
    }, true).catch(fileError('delete', config.remotePath, false));
  });
}

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
      if (disableWatch) {
        return;
      }

      if (!isValidFile(uri)) {
        return;
      }

      uploadQueue.push(uri);
      doUpload();
    });
  }

  if (watchConfig.autoDelete) {
    watcher.onDidDelete(uri => {
      if (disableWatch) {
        return;
      }

      if (!isValidFile(uri)) {
        return;
      }

      deleteQueue.push(uri);
      doDelete();
    });
  }
}

let workspaceWatcher = null;

let disableWatch = false;

export function disableWatcher() {
  disableWatch = true;
}

export function enableWatcher() {
  if (!disableWatch) {
    return;
  }

  setTimeout(() => {
    disableWatch = false;
  }, 300); // delay because change happens after task finish.
}

export function onFileChange(cb: (uri: vscode.Uri) => void) {
  if (!workspaceWatcher) {
     workspaceWatcher = vscode.workspace.createFileSystemWatcher(`${vscode.workspace.rootPath}/**`, true, false, true);
  }

  workspaceWatcher.onDidChange(uri => {
    if (disableWatch) {
      return;
    }

    if (!isValidFile(uri)) {
      return;
    }

    cb(uri);
  });
}

export function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}

export function clearAllWatcher() {
  if (workspaceWatcher) {
    clearWatcher(workspaceWatcher);
  }
  Object.keys(watchers).forEach(key => clearWatcher(watchers[key]));
}
