import { COMMAND_UPDATE_LOCAL_TO_REMOTE } from '../constants';
import { sync2Remote, SyncModel } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFolderFallbackToConfigContext, uriFromfspath, applySelector } from './shared';

export default checkFileCommand({
  id: COMMAND_UPDATE_LOCAL_TO_REMOTE,
  getFileTarget: applySelector(uriFromfspath, selectFolderFallbackToConfigContext),

  handleFile(ctx) {
    return sync2Remote(ctx, { model: SyncModel.UPDATE });
  },
});
