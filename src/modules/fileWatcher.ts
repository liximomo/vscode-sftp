import * as vscode from 'vscode';
import * as path from 'path';

import { CONGIF_FILENAME, DEPRECATED_CONGIF_FILENAME } from '../constants';
import { isValidFile } from '../helper/documentFilter';
import throttle from '../helper/throttle';
import { upload } from './sync';
import { getConfig, fillGlobPattern } from './config';
import { removeRemote } from './sync';
import * as output from './output';

const watchers = {};
const uploadQueue = [];
const deleteQueue = [];

const ACTION_INTEVAL = 500;

function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME || filename === DEPRECATED_CONGIF_FILENAME;
}

function fileError(event, file, showErrorWindow = true) {
  return error => {
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

    removeRemote(
      config.remotePath,
      {
        ...config,
        skipDir: true,
      },
      true
    ).catch(fileError('delete', config.remotePath, false));
  });
}

const throttledUpload = throttle(doUpload, ACTION_INTEVAL);
const throttledDelete = throttle(doDelete, ACTION_INTEVAL);

function clearWatcher(fileWatcher) {
  fileWatcher.dispose();
}

function setUpWatcher(config) {
  const watchConfig = config.watcher !== undefined ? config.watcher : {};

  let watcher = watchers[config.configRoot];
  if (watcher) {
    // clear old watcher
    clearWatcher(watcher);
  }

  const shouldAddListenser = watchConfig.autoUpload || watchConfig.autoDelete;
  // tslint:disable-next-line triple-equals
  if (watchConfig.files == false || !shouldAddListenser) {
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
      throttledUpload();
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
      throttledDelete();
    });
  }
}

const workspaceWatchers = [];

let disableWatch = false;

export function disableWatcher() {
  disableWatch = true;
}

export function enableWatcher() {
  if (!disableWatch) {
    return;
  }

  // delay because change happens after this, need make sure this execute after change event
  setTimeout(() => {
    disableWatch = false;
  }, 2000);
}

/**
 * implement upload on save
 */
export function watchFolder(directory, {
  onConfigChange,
  onConfigDelete,
  onFileChange,
}: {
  onConfigChange: (uri: vscode.Uri) => void,
  onConfigDelete: (uri: vscode.Uri) => void,
  onFileChange: (uri: vscode.Uri) => void,
}) {
  const watcher = vscode.workspace.createFileSystemWatcher(
    `${directory}/**`,
    false,
    false,
    false
  );
  workspaceWatchers.push(watcher);

  watcher.onDidCreate(uri => {
    if (isConfigFile(uri)) {
      onConfigChange(uri);
    }
  });

  watcher.onDidChange(uri => {
    if (disableWatch) {
      return;
    }

    if (!isValidFile(uri)) {
      return;
    }

    if (isConfigFile(uri)) {
      onConfigChange(uri);
      return;
    }

    onFileChange(uri);
  });

  watcher.onDidDelete(uri => {
    if (isConfigFile(uri)) {
      onConfigDelete(uri);
    }
  });
}

export function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}

export function clearAllWatcher() {
  Object
    .keys(watchers)
    .concat(workspaceWatchers)
    .forEach(key => clearWatcher(watchers[key]));
}
