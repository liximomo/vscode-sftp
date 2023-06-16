import { COMMAND_UPLOAD_TO_ALL_PROFILES } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import fileCommandUpload from './fileCommandUpload';

export default checkFileCommand({
  ...fileCommandUpload,
  id: COMMAND_UPLOAD_TO_ALL_PROFILES
});
