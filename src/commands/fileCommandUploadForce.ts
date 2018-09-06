import { UResource, FileService } from '../core';
import { COMMAND_FORCE_UPLOAD } from '../constants';
import { upload } from '../fileHandlers';
import { refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class ForceUpload extends FileCommand {
  static id = COMMAND_FORCE_UPLOAD;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await upload(uResource, fileService, { ignore: null });
    refreshRemoteExplorer(uResource, fileService);
  }
}
