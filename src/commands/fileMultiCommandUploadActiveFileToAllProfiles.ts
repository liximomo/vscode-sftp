import { COMMAND_UPLOAD_ACTIVEFILE_TO_ALL_PROFILES } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import fileCommandUploadActiveFile from './fileCommandUploadActiveFile';


export default checkFileCommand({
  ...fileCommandUploadActiveFile,
  id: COMMAND_UPLOAD_ACTIVEFILE_TO_ALL_PROFILES
});
