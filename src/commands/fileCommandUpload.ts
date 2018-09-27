import { COMMAND_UPLOAD } from '../constants';
import { upload } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromfspath } from './shared';

export default checkFileCommand({
  id: COMMAND_UPLOAD,
  getFileTarget: uriFromfspath,

  async handleFile(ctx) {
    await upload(ctx, { ignore: null });
  },
});
