import * as vscode from 'vscode';
import * as path from 'path';
import { sftpBarItem } from '../global';
import { CONGIF_FILENAME } from '../constants';
import { isValidFile } from '../helper/documentFilter';
import fileDepth from '../helper/fileDepth';
import throttle from '../helper/throttle';
import { upload, removeRemote } from '../actions';
import { getConfig } from './config';
import * as output from './output';
import logger from '../logger';
import { simplifyPath } from '../host';

let workspaceWatcher: vscode.Disposable;
const watchers: {
  [x: string]: vscode.FileSystemWatcher;
} = {};

const uploadBuffer = new Set();
const deleteBuffer = new Set();

const ACTION_INTEVAL = 300;

function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME;
}

function doUpload() {
  const files = [...uploadBuffer].slice().sort((a, b) => fileDepth(b) - fileDepth(a));
  uploadBuffer.clear();

  files.forEach(async file => {
    let config;
    try {
      config = getConfig(file);
    } catch (error) {
      output.onError(error);
      return;
    }

    try {
      await upload(file, config);
      logger.info(`[watcher] upload ${file}`);
      sftpBarItem.showMsg(`upload ${path.basename(file)}`, simplifyPath(file), 2 * 1000);
    } catch (error) {
      logger.error(`[watcher] upload ${file} error`, '\n', error.stack);
      output.show();
    }
  });
}

function doDelete() {
  const files = [...deleteBuffer].slice().sort((a, b) => fileDepth(b) - fileDepth(a));
  deleteBuffer.clear();

  let config;
  files.forEach(async file => {
    try {
      config = getConfig(file);
    } catch (error) {
      output.onError(error);
      return;
    }

    try {
      await removeRemote(config.remotePath, {
        ...config,
        skipDir: true,
      });
      logger.info(`[watcher] delete ${file}`);
      sftpBarItem.showMsg(`delete ${path.basename(file)}`, simplifyPath(file), 2 * 1000);
    } catch (error) {
      logger.error(`[watcher] delete ${file} error`, error.stack);
    }
  });
}

const throttledUpload = throttle(doUpload, ACTION_INTEVAL, { leading: false });
const throttledDelete = throttle(doDelete, ACTION_INTEVAL, { leading: false });

function uploadHandler(uri: vscode.Uri) {
  if (!isValidFile(uri)) {
    return;
  }

  uploadBuffer.add(uri.fsPath);
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

      deleteBuffer.add(uri.fsPath);
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
