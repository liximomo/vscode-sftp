import { COMMAND_FORCE_UPLOAD } from '../constants';
import { upload } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default checkFileCommand({
  id: COMMAND_FORCE_UPLOAD,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    await upload(ctx, { ignore: null });
  },
});
