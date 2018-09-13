import { UResource, FileService } from '../core';
import { COMMAND_FORCE_UPLOAD } from '../constants';
import { upload } from '../fileHandlers';
import { refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default class ForceUpload extends FileCommand {
  static id = COMMAND_FORCE_UPLOAD;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await upload(uResource, fileService, config, { ignore: null });
    refreshRemoteExplorer(uResource, fileService);
  }
}
