import { COMMAND_DIFF } from '../constants';
import { diff } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default checkFileCommand({
  id: COMMAND_DIFF,
  getFileTarget: uriFromExplorerContextOrEditorContext,
  handleFile: diff,
});
