import BaseCommand from './BaseCommand';

export default class Command extends BaseCommand {
  protected handler: (...args: any[]) => any;

  constructor(id, name, handler) {
    super(id, name);
    this.handler = handler;
  }

  protected async run(...args) {
    try {
      return await this.handler(...args);
    } finally {
      this.commitCommandDone();
    }
  }
}
