import { COMMAND_UPLOAD_ACTIVEFOLDER_TO_ALL_PROFILES } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import fileCommandUploadActiveFolder from './fileCommandUploadActiveFolder';

export default checkFileCommand({
  ...fileCommandUploadActiveFolder,
  id: COMMAND_UPLOAD_ACTIVEFOLDER_TO_ALL_PROFILES,
});
