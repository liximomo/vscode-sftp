import { COMMAND_DOWNLOAD_ACTIVEFOLDER } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import { getActiveFolder } from './shared';
import fileCommandDownloadFolder from './fileCommandDownloadFolder';

export default checkFileCommand({
  ...fileCommandDownloadFolder,
  id: COMMAND_DOWNLOAD_ACTIVEFOLDER,
  getFileTarget: getActiveFolder,
});
