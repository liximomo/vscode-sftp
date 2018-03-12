import { getConfig } from './config';
import { upload } from '../actions';
import * as output from './output';

export default function autoSave(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // ignore config error
    return;
  }

  if (config.uploadOnSave) {
    upload(activityPath, config).catch(output.onError);
  }
}
