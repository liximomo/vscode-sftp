import { getConfig } from '../modules/config';
import { sync2Remote } from '../modules/sync';
import * as output from '../modules/output';

export default function autoSave(file) {
  const activityPath = file.fileName;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // allow config error
    return;
  }

  if (config.uploadOnSave) {
    sync2Remote(activityPath, config).catch(output.errorMsg);
  }
}
