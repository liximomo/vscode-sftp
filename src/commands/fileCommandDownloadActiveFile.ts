import { COMMAND_DOWNLOAD_ACTIVEFILE } from '../constants';
import { downloadFile } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { getActiveDocumentUri } from './shared';

export default checkFileCommand({
  id: COMMAND_DOWNLOAD_ACTIVEFILE,
  getFileTarget: getActiveDocumentUri,

  async handleFile(ctx) {
    await downloadFile(ctx, { ignore: null });
  },
});
