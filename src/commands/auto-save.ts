import { getConfig } from '../modules/config';
import { upload } from '../modules/sync';
import * as output from '../modules/output';

export default function autoSave(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // allow config error
    return;
  }

  if (config.uploadOnSave) {
    upload(activityPath, config).catch(output.onError);
  }
}
