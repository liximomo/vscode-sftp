import { COMMAND_UPDATE_REMOTE_TO_LOCAL } from '../constants';
import { sync2Local, SyncModel } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFolderFallbackToConfigContext, uriFromfspath, applySelector } from './shared';

export default checkFileCommand({
  id: COMMAND_UPDATE_REMOTE_TO_LOCAL,
  getFileTarget: applySelector(uriFromfspath, selectFolderFallbackToConfigContext),

  handleFile(ctx) {
    return sync2Local(ctx, { model: SyncModel.UPDATE });
  },
});
