// import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { sync2Remote, sync2Local } from '../modules/sync';

// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

export function sync2RemoteCommand(item) {
  const activityPath = item.fsPath;
  getConfig(activityPath)
    .then(config => sync2Remote(activityPath, config));
}

export function sync2LocalCommand(item) {
  const activityPath = item.fsPath;
  getConfig(activityPath)
    .then(config => sync2Local(activityPath, config));
}
