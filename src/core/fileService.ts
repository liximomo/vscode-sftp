import { EventEmitter } from 'events';
import * as path from 'path';
import app from '../app';
import upath from './upath';
import Ignore from './ignore';
import { FileSystem } from './fs';
import Scheduler from './scheduler';
import { filesIgnoredFromConfig } from '../helper';
import { createRemoteIfNoneExist, removeRemote } from './remoteFs';
import TransferTask from './transferTask';
import localFs from './localFs';

interface WatcherConfig {
  files: false | string;
  autoUpload: boolean;
  autoDelete: boolean;
}

export interface WatcherService {
  create(watcherBase: string, watcherConfig: WatcherConfig): any;
  dispose(watcherBase: string): void;
}

interface TransferScheduler {
  size: number;
  add(x: TransferTask): void;
  run(): Promise<void>;
}

type ConfigValidator = (x: any) => { message: string };

let id = 0;

function getHostInfo(config) {
  const ignoreOptions = [
    'name',
    'remotePath',
    'uploadOnSave',
    'downloadOnOpen',
    'syncMode',
    'ignore',
    'ignoreFile',
    'watcher',
    'concurrency',
    'sshConfigPath',
  ];

  return Object.keys(config).reduce((obj, key) => {
    if (ignoreOptions.indexOf(key) === -1) {
      obj[key] = config[key];
    }
    return obj;
  }, {});
}

enum Event {
  BEFORE_TRANSFER = 'BEFORE_TRANSFER',
  AFTER_TRANSFER = 'AFTER_TRANSFER',
}

export default class FileService {
  private _eventEmitter: EventEmitter = new EventEmitter();
  private _name: string;
  private _watcherConfig: WatcherConfig;
  private _profiles: string[];
  private _pendingTransferTasks: Set<TransferTask> = new Set();
  private _config: any;
  private _configValidator: ConfigValidator;
  private _watcherService: WatcherService = {
    create() {
      /* do nothing  */
    },
    dispose() {
      /* do nothing  */
    },
  };
  id: number;
  baseDir: string;
  workspace: string;

  constructor(baseDir: string, workspace: string, config: any) {
    this.id = ++id;
    this.workspace = workspace;
    this.baseDir = baseDir;
    this._watcherConfig = config.watcher;
    this._config = config;
    if (config.profiles) {
      this._profiles = Object.keys(config.profiles);
    }
  }

  get name(): string {
    return this._name ? this._name : '';
  }

  set name(name: string) {
    this._name = name;
  }

  setConfigValidator(configValidator: ConfigValidator) {
    this._configValidator = configValidator;
  }

  setWatcherService(watcherService: WatcherService) {
    if (this._watcherService) {
      this._disposeWatcher();
    }

    this._watcherService = watcherService;
    this._createWatcher();
  }

  getAvaliableProfiles(): string[] {
    return this._profiles || [];
  }

  getPendingTransferTasks(): Readonly<TransferTask[]> {
    return Array.from(this._pendingTransferTasks);
  }

  beforeTransfer(listener: (task: TransferTask) => void) {
    this._eventEmitter.on(Event.BEFORE_TRANSFER, listener);
  }

  afterTransfer(listener: (err: Error | null, task: TransferTask) => void) {
    this._eventEmitter.on(Event.AFTER_TRANSFER, listener);
  }

  createTransferScheduler(concurrency): TransferScheduler {
    const scheduler = new Scheduler({
      autoStart: false,
      concurrency,
    });

    scheduler.onTaskStart(task => {
      this._pendingTransferTasks.add(task as TransferTask);
      this._eventEmitter.emit(Event.BEFORE_TRANSFER, task);
    });
    scheduler.onTaskDone((err, task) => {
      this._pendingTransferTasks.delete(task as TransferTask);
      this._eventEmitter.emit(Event.AFTER_TRANSFER, err, task);
    });

    return {
      get size() {
        return scheduler.size;
      },
      add(task: TransferTask) {
        scheduler.add(task);
      },
      run() {
        return new Promise(resolve => {
          if (scheduler.size <= 0) {
            return resolve();
          }

          scheduler.onIdle(resolve);
          scheduler.start();
        });
      },
    };
  }

  getLocalFileSystem(): FileSystem {
    return localFs;
  }

  getRemoteFileSystem(): Promise<FileSystem> {
    return createRemoteIfNoneExist(getHostInfo(this.getConfig()));
  }

  getConfig(): any {
    const config = this._config;
    const copied = Object.assign({}, config);
    delete copied.profiles;

    if (config.agent && config.agent.startsWith('$')) {
      const evnVarName = config.agent.slice(1);
      const val = process.env[evnVarName];
      if (!val) {
        throw new Error(`Environment variable "${evnVarName}" not found`);
      }
      copied.agent = val;
    }

    const hasProfile = config.profiles && Object.keys(config.profiles).length > 0;
    if (hasProfile && app.state.profile) {
      const profile = config.profiles[app.state.profile];
      if (!profile) {
        throw new Error(
          `Unkown Profile "${app.state.profile}".` +
            ' Please check your profile setting.' +
            ' You can set a profile by running command `SFTP: Set Profile`.'
        );
      }
      Object.assign(copied, profile);
    }

    // validate config
    const error = this._configValidator && this._configValidator(copied);
    if (error) {
      let errorMsg = `Config validation fail: ${error.message}.`;
      // tslint:disable-next-line triple-equals
      if (hasProfile && app.state.profile == null) {
        errorMsg += ' Maybe you should set a profile first.';
      }
      throw new Error(errorMsg);
    }

    // convert ingore config to ignore function
    copied.ignore = this._createIgnoreFn(copied.remotePath);
    return copied;
  }

  dispose() {
    this._disposeWatcher();
    this._disposeFileSystem();
  }

  private _createIgnoreFn(remoteContext: string): (fsPath: string) => boolean {
    const localContext = this.baseDir;

    const ignoreConfig = filesIgnoredFromConfig(this._config);
    if (ignoreConfig.length <= 0) {
      return null;
    }

    const ignore = Ignore.from(ignoreConfig);
    const ignoreFunc = fsPath => {
      // vscode will always return path with / as separator
      const normalizedPath = path.normalize(fsPath);
      let relativePath;
      if (normalizedPath.indexOf(localContext) === 0) {
        // local path
        relativePath = path.relative(localContext, fsPath);
      } else {
        // remote path
        relativePath = upath.relative(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    };

    return ignoreFunc;
  }

  private _createWatcher() {
    this._watcherService.create(this.baseDir, this._watcherConfig);
  }

  private _disposeWatcher() {
    this._watcherService.dispose(this.baseDir);
  }

  private _disposeFileSystem() {
    return removeRemote(getHostInfo(this.getConfig()));
  }
}
