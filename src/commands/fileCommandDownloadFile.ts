import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_FILE } from '../constants';
import { download } from '../fileHandlers';
import { uriFromExplorerContextOrEditorContext } from './shared';
import FileCommand from './abstract/fileCommand';

export default class DownloadFile extends FileCommand {
  static id = COMMAND_DOWNLOAD_FILE;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config, { ignore: null });
  }
}
