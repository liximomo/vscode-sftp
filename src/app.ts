import * as LRU from 'lru-cache';
import StatusBarItem from './ui/StatusBarItem';
import { COMMAND_TOGGLE_OUTPUT } from './constants';
import AppState from './modules/AppState';

interface App {
  ignoreFileCache: LRU.Cache<string, string[]>;
  state: AppState;
  sftpBarItem: StatusBarItem;
}

const app: App = Object.create(null);

app.state = new AppState();
app.sftpBarItem = new StatusBarItem(
  () => {
    if (app.state.profile) {
      return `(${app.state.profile})SFTP`;
    } else {
      return 'SFTP';
    }
  },
  'SFTP@liximomo',
  COMMAND_TOGGLE_OUTPUT
);
app.ignoreFileCache = LRU<string, string[]>({ max: 6 });

export default app;
