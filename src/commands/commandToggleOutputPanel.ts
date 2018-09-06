import { COMMAND_TOGGLE_OUTPUT } from '../constants';
import * as output from '../ui/output';
import Command from './abstract/command';

export default class ToggleOutputPanel extends Command {
  static id = COMMAND_TOGGLE_OUTPUT;

  doCommandRun() {
    output.toggle();
  }
}
