import { UResource, FileService } from '../core';
import { COMMAND_UPLOAD_ACTIVEFILE } from '../constants';
import { upload } from '../fileHandlers';
import { refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { getActiveDocumentUri } from './shared';

export default class UploadActiveFile extends FileCommand {
  static id = COMMAND_UPLOAD_ACTIVEFILE;
  static getFileTarget = getActiveDocumentUri;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await upload(uResource, fileService, config, { ignore: null });
    refreshRemoteExplorer(uResource, fileService);
  }
}
