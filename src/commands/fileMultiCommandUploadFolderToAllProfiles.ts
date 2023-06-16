import { COMMAND_UPLOAD_FOLDER_TO_ALL_PROFILES } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import fileCommandUploadFolder from './fileCommandUploadFolder';

export default checkFileCommand({
  ...fileCommandUploadFolder,
  id: COMMAND_UPLOAD_FOLDER_TO_ALL_PROFILES
});
