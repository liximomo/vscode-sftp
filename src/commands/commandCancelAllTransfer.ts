import { COMMAND_CANCEL_ALL_TRANSFER } from '../constants';
import { checkCommand } from './abstract/createCommand';
import { findAllFileService } from '../modules/serviceManager';

export default checkCommand({
  id: COMMAND_CANCEL_ALL_TRANSFER,

  async handleCommand() {
    findAllFileService(f => f.isTransferring()).forEach(f => f.cancelTransferTasks());
  },
});
