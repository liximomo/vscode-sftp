import { COMMAND_DOWNLOAD } from '../constants';
import { download } from '../fileHandlers';
import { uriFromfspath } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_DOWNLOAD,
  getFileTarget: uriFromfspath,

  async handleFile(ctx) {
    await download(ctx, { ignore: null });
  },
});
