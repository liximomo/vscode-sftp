import { COMMAND_SYNC_TO_LOCAL } from '../constants';
import { sync2Local } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFolderFallbackToConfigContext } from './shared';

export default checkFileCommand({
  id: COMMAND_SYNC_TO_LOCAL,
  getFileTarget: selectFolderFallbackToConfigContext,

  handleFile: sync2Local,
});
