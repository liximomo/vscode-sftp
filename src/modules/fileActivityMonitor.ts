import { TextDocument } from 'vscode';
import { onDidOpenTextDocument } from '../host';
import { sftpBarItem } from '../global';
import { download } from '../actions';
import logger from '../logger';
import { getConfig } from './config';
import * as output from './output';

async function downloadOnOpen(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // ignore config error
    return;
  }

  if (config.downloadOnOpen) {
    await download(activityPath, config).catch(output.onError);
    logger.info(`[file-open] download ${activityPath}`);
    sftpBarItem.showMsg('download done', 2 * 1000);
  }
}

export default function fileActivityMonitor() {
  onDidOpenTextDocument((doc: TextDocument) => {
    downloadOnOpen(doc.uri);
  });
}
