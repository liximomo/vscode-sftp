import { UResource, FileService } from '../core';
import { COMMAND_REMOTEEXPLORER_EDITINLOCAL } from '../constants';
import { download } from '../fileHandlers';
import { showTextDocument } from '../host';
import { uriFromExplorerContextOrEditorContext } from './shared';
import FileCommand from './abstract/fileCommand';

export default class EditInLocal extends FileCommand {
  static id = COMMAND_REMOTEEXPLORER_EDITINLOCAL;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config, { ignore: null });
    await showTextDocument(uResource.localUri, { preview: true });
  }
}
