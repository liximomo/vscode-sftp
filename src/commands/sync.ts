import * as vscode from 'vscode';

import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { sync2Remote, sync2Local } from '../modules/sync';

// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

export function sync2RemoteCommand(item) {
  if (!(item && item.fsPath)) {
    output.errorMsg(new Error('command must run on a file or directory!'));
    return;
  }

  const activityPath = item.fsPath;
  getConfig(activityPath, vscode.workspace.rootPath)
    .then(config => sync2Remote(activityPath, config))
    .catch(output.errorMsg);
}

export function sync2LocalCommand(item) {
  if (!(item && item.fsPath)) {
    output.errorMsg(new Error('command must run on a file or directory!'));
    return;
  }

  const activityPath = item.fsPath;
  getConfig(activityPath, vscode.workspace.rootPath)
    .then(config => sync2Local(activityPath, config))
    .catch(output.errorMsg);
}
