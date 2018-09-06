import { COMMAND_DELETE_REMOTE } from '../constants';
import { upath, UResource, FileService } from '../core';
import { removeRemote } from '../fileHandlers';
import { showConfirmMessage } from '../host';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class DeleteRemote extends FileCommand {
  static id = COMMAND_DELETE_REMOTE;
  static option = {
    requireTarget: false,
  };
  static async getFileTarget(item, items) {
    const targets = await selectActivedFile(item, items);

    const filename = Array.isArray(targets)
      ? targets.map(t => upath.basename(t.fsPath)).join('\n')
      : upath.basename(targets.fsPath);
    const result = await showConfirmMessage(
      `Are you sure you want to delete ${filename}'?`,
      'Delete',
      'Cancel'
    );

    return result ? targets : null;
  }

  async handleFile(uResource: UResource, fileService: FileService) {
    return removeRemote(uResource, fileService);
  }
}
