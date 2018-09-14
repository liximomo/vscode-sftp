import { COMMAND_UPLOAD_FOLDER } from '../constants';
import { uploadFolder } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default checkFileCommand({
  id: COMMAND_UPLOAD_FOLDER,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  handleFile: uploadFolder,
});
