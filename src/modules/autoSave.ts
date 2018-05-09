import { getConfig } from './config';
import * as output from './output';
import { sftpBarItem } from '../global';
import { upload } from '../actions';
import logger from '../logger';

export default async function autoSave(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // ignore config error
    return;
  }

  if (config.uploadOnSave) {
    try {
      await upload(activityPath, config);
      logger.info(`[file-save] upload ${activityPath}`);
    } catch (error) {
      output.onError(error);
    }
    sftpBarItem.showMsg('upload done', 2 * 1000);
  }
}
