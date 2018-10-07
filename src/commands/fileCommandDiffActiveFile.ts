import { COMMAND_DIFF_ACTIVEFILE } from '../constants';
import { diff } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { getActiveDocumentUri } from './shared';

export default checkFileCommand({
  id: COMMAND_DIFF_ACTIVEFILE,
  getFileTarget: getActiveDocumentUri,
  handleFile: diff,
});
