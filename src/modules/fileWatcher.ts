import * as vscode from 'vscode';

import { upload } from './sync';
import { getConfig } from './config';
import * as output from './output';

const watchers = {};

function clearWatch(fileWatcher) {
  fileWatcher.dispose();
}

function setUpWatcher(config) {
  if (!config.autoUploadGeneratedFile) {
    const watcher = watchers[config.configRoot];
    if (watcher) {
      clearWatch(watcher);
    }
    return;
  }

  const watcher = vscode.workspace.createFileSystemWatcher(`${config.configRoot}/**`, true, false, false);
  watchers[config.configRoot] = watcher;

  watcher.onDidCreate(uri => {
    const file = uri.fsPath;
    try {
      const config = getConfig(file);
      upload(file, config).catch(output.onError);
    } catch (error) {
      output.onError(error);
    }
  });
}

export default function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}
