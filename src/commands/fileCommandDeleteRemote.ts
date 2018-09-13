import { COMMAND_DELETE_REMOTE } from '../constants';
import { upath, UResource, FileService } from '../core';
import { removeRemote } from '../fileHandlers';
import { showConfirmMessage } from '../host';
import FileCommand from './abstract/fileCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default class DeleteRemote extends FileCommand {
  static id = COMMAND_DELETE_REMOTE;
  static async getFileTarget(item, items) {
    const targets = await uriFromExplorerContextOrEditorContext(item, items);

    const filename = Array.isArray(targets)
      ? targets.map(t => upath.basename(t.fsPath)).join(',')
      : upath.basename(targets.fsPath);
    const result = await showConfirmMessage(
      `Are you sure you want to delete '${filename}'?`,
      'Delete',
      'Cancel'
    );

    return result ? targets : null;
  }

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    return removeRemote(uResource, fileService, config);
  }
}
