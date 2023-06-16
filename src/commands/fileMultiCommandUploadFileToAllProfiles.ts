import { COMMAND_UPLOAD_FILE_TO_ALL_PROFILES } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import fileCommandUploadFile from './fileCommandUploadFile';

export default checkFileCommand({
  ...fileCommandUploadFile,
  id: COMMAND_UPLOAD_FILE_TO_ALL_PROFILES
});
