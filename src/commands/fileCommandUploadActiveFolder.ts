import { COMMAND_UPLOAD_ACTIVEFOLDER } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import { getActiveFolder } from './shared';
import fileCommandUploadFolder from './fileCommandUploadFolder';

export default checkFileCommand({
  ...fileCommandUploadFolder,
  id: COMMAND_UPLOAD_ACTIVEFOLDER,
  getFileTarget: getActiveFolder,
});
