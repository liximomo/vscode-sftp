import { UResource, FileService } from '../core';
import { COMMAND_REMOTEEXPLORER_EDITINLOCAL } from '../constants';
import { download } from '../fileHandlers';
import { showTextDocument } from '../host';
import { selectActivedFile } from './shared';
import FileCommand from './abstract/fileCommand';

export default class EditInLocal extends FileCommand {
  static id = COMMAND_REMOTEEXPLORER_EDITINLOCAL;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService, { ignore: null });
    await showTextDocument(uResource.localUri, { preview: true });
  }
}
