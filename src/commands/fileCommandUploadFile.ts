import { UResource, FileService } from '../core';
import { COMMAND_UPLOAD_FILE } from '../constants';
import { upload } from '../fileHandlers';
import { refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class UploadFile extends FileCommand {
  static id = COMMAND_UPLOAD_FILE;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await upload(uResource, fileService, { ignore: null });
    refreshRemoteExplorer(uResource, false);
  }
}
