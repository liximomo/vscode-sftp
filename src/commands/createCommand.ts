import Command from './Command';
import FileCommand from './FileCommand';

export default function createCommand(id, name, handler) {
  return new Command(id, name, handler);
}

export function createFileCommand(id, name, handler, getFileTarget, warnEmptyTarget = true) {
  return new FileCommand(id, name, handler, getFileTarget, warnEmptyTarget);
}
