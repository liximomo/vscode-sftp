import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_ACTIVEFILE } from '../constants';
import { download } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { getActiveDocumentUri } from './shared';

export default class DownloadActiveFile extends FileCommand {
  static id = COMMAND_DOWNLOAD_ACTIVEFILE;
  static getFileTarget = getActiveDocumentUri;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config, { ignore: null });
  }
}
