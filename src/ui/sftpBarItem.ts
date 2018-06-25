import StatusBarItem from './StatusBarItem';
import { COMMAND_TOGGLE_OUTPUT } from '../constants';
import appState from '../modules/appState';

const sftpBarItem = new StatusBarItem(
  () => {
    if (appState.profile) {
      return `(${appState.profile})SFTP`;
    } else {
      return 'SFTP';
    }
  },
  'SFTP@liximomo',
  COMMAND_TOGGLE_OUTPUT
);

export default sftpBarItem;
