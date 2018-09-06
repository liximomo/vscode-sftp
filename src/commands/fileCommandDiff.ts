import { UResource, FileService } from '../core';
import { COMMAND_DIFF } from '../constants';
import { diff } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class Diff extends FileCommand {
  static id = COMMAND_DIFF;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await diff(uResource, fileService);
  }
}
