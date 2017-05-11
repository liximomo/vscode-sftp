import * as vscode from 'vscode';

import { getConfig } from '../modules/config';
import { sync2Remote } from '../modules/sync';
import * as output from '../modules/output';

export default function autoSave(file) {
  const activityPath = file.fileName;
  getConfig(activityPath, vscode.workspace.rootPath)
    .then(config => {
      if (config.uploadOnSave) {
        sync2Remote(activityPath, config)
      }
    })
    .catch(output.errorMsg);
}
