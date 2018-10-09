import { COMMAND_SYNC_REMOTE_TO_LOCAL } from '../constants';
import { sync2Local } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFolderFallbackToConfigContext, uriFromfspath, applySelector } from './shared';

export default checkFileCommand({
  id: COMMAND_SYNC_REMOTE_TO_LOCAL,
  getFileTarget: applySelector(uriFromfspath, selectFolderFallbackToConfigContext),

  handleFile: sync2Local,
});
