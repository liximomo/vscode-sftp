import * as vscode from 'vscode';
import { getConfig } from '../modules/config';
import { sync2Remote } from '../modules/sync';

export default function autoSave(file) {
  const activityPath = file.fileName;
  getConfig(activityPath)
    .then(config => {
      if (config.uploadOnSave) {
        sync2Remote(activityPath, config)
      }
    });
}
