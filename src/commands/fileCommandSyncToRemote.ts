import { COMMAND_SYNC_TO_REMOTE } from '../constants';
import { sync2Remote } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFolderFallbackToConfigContext } from './shared';

export default checkFileCommand({
  id: COMMAND_SYNC_TO_REMOTE,
  getFileTarget: selectFolderFallbackToConfigContext,

  handleFile: sync2Remote,
});
