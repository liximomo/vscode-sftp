import { COMMAND_DOWNLOAD_PROJECT } from '../constants';
import { downloadFolder } from '../fileHandlers';
import { selectContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_DOWNLOAD_PROJECT,
  getFileTarget: selectContext,

  async handleFile(ctx) {
    await downloadFolder(ctx);
  },
});
