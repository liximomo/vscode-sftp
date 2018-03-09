import { getConfig } from '../modules/config';
import { upload } from '../modules/sync';
import * as output from '../modules/output';

export default function autoSave(uri) {
  const activityPath = uri.fsPath;
  let configs;
  try {
    configs = getConfig(activityPath);
  } catch (error) {
    // ignore config error
    return;
  }
  
  configs.forEach(config => {
    if (config.uploadOnSave) {
      upload(activityPath, config).catch(output.onError);
    }
  });

  
}
