import * as output from '../modules/output';
import { getConfig } from '../modules/config';

export function createFileCommand(fileTask) {
  return item => {
    if (!(item && item.fsPath)) {
      output.errorMsg(new Error('command must run on a file or directory!'));
      return;
    }

    const activityPath = item.fsPath;
    try {
      const config = getConfig(activityPath);
      fileTask(activityPath, config).catch(output.errorMsg);
    } catch (error) {
      output.errorMsg(error);
    }
  };
}
