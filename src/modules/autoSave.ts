import { getConfig } from './config';
import { upload } from '../actions';
import * as output from './output';
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
    await upload(activityPath, config).catch(output.onError);
    logger.info(`[audo-save] upload ${activityPath}`);
    output.status.msg('upload done', 2 * 1000);
  }
}
