import * as vscode from 'vscode';
import * as path from 'path';
import { CONGIF_FILENAME } from '../constants';
import { isValidFile } from '../helper/documentFilter';
import throttle from '../helper/throttle';
import { upload, removeRemote } from '../actions';
import { getConfig } from './config';
import * as output from './output';
import logger from '../logger';

let workspaceWatcher: vscode.Disposable;
const watchers: {
  [x: string]: vscode.FileSystemWatcher;
} = {};

const uploadQueue = [];
const deleteQueue = [];

const ACTION_INTEVAL = 500;

function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME;
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
  const files = uploadQueue
    .slice()
    .map(uri => uri.fsPath)
    .sort();
  uploadQueue.length = 0;
  files.forEach(file => {
    let config;
    try {
      config = getConfig(file);
    } catch (error) {
      output.onError(error);
      return;
    }

    upload(file, config).then(() => {
      logger.info('[watcher]', `upload ${file}`);
      output.status.msg(`upload ${file}`, 2 * 1000);
    }, fileError('upload', file));
  });
}

function doDelete() {
  const files = deleteQueue
    .slice()
    .map(uri => uri.fsPath)
    .sort();
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
    }).then(() => {
      logger.info('[watcher]', `delete ${file}`);
      output.status.msg(`delete ${file}`, 2 * 1000);
    }, fileError('delete', config.remotePath, false));
  });
}

const throttledUpload = throttle(doUpload, ACTION_INTEVAL);
const throttledDelete = throttle(doDelete, ACTION_INTEVAL);

function uploadHandler(uri: vscode.Uri) {
  if (!isValidFile(uri)) {
    return;
  }

  uploadQueue.push(uri);
  throttledUpload();
}

function getWatcherByConfig(config) {
  return watchers[config.context];
}

function removeWatcherByConfig(config) {
  return delete watchers[config.context];
}

function getWatchs() {
  return Object.keys(watchers).map(key => watchers[key]);
}

function setUpWatcher(config) {
  const watchConfig = config.watcher !== undefined ? config.watcher : {};

  let watcher = getWatcherByConfig(config);
  if (watcher) {
    // clear old watcher
    watcher.dispose();
  }

  const shouldAddListenser = watchConfig.autoUpload || watchConfig.autoDelete;
  // tslint:disable-next-line triple-equals
  if (watchConfig.files == false || !shouldAddListenser) {
    return;
  }

  watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(config.context, watchConfig.files),
    false,
    false,
    false
  );
  watchers[config.context] = watcher;

  if (watchConfig.autoUpload) {
    watcher.onDidCreate(uploadHandler);
    watcher.onDidChange(uploadHandler);
  }

  if (watchConfig.autoDelete) {
    watcher.onDidDelete(uri => {
      if (!isValidFile(uri)) {
        return;
      }

      deleteQueue.push(uri);
      throttledDelete();
    });
  }
}

export function disableWatcher(config) {
  const watcher = getWatcherByConfig(config);
  if (watcher) {
    watcher.dispose();
    removeWatcherByConfig(config);
  }
}

export function enableWatcher(config) {
  if (getWatcherByConfig(config) !== undefined) {
    return;
  }

  // delay setup watcher to avoid download event
  setTimeout(() => {
    setUpWatcher(config);
  }, 1000 * 3);
}

export function watchWorkspace({
  onDidSaveFile,
  onDidSaveSftpConfig,
}: {
  onDidSaveFile: (uri: vscode.Uri) => void;
  onDidSaveSftpConfig: (uri: vscode.Uri) => void;
}) {
  if (workspaceWatcher) {
    workspaceWatcher.dispose();
  }

  workspaceWatcher = vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
    const uri = doc.uri;
    if (!isValidFile(uri)) {
      return;
    }

    // let configWatcher do this
    if (isConfigFile(uri)) {
      onDidSaveSftpConfig(uri);
      return;
    }

    onDidSaveFile(uri);
  });
}

export function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}

export function clearAllWatcher() {
  const disposable = vscode.Disposable.from(...getWatchs(), workspaceWatcher);
  disposable.dispose();
}
