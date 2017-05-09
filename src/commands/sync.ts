import { getConfig } from '../modules/config';
import upload from '../modules/upload';
// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

export function sync2Remote(item) {
  const activityPath = item.fsPath;
  getConfig(activityPath)
    .then(config => {
      upload(activityPath, config.remotePath, config);
    });
}

export function sync2Local(item) {
  console.log('sync2Local', item);
}
