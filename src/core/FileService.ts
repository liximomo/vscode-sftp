import app from '../app';
import upath from './upath';
import FileSystem from './Fs/FileSystem';
import { getHostInfo } from '../helper';
import { createRemoteIfNoneExist, removeRemote } from './remoteFs';

interface WatcherConfig {
  files: false | string;
  autoUpload: boolean;
  autoDelete: boolean;
}

export interface WatcherService {
  create(watcherBase: string, watcherConfig: WatcherConfig): any;
  dispose(watcherBase: string): void;
}

type ConfigValidator = (x: any) => { message: string };

let id = 0;

export default class FileService {
  private _name: string;
  private _watcher: WatcherConfig;
  private _config: any;
  private _configValidator: ConfigValidator;
  private _profiles: string[];
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
    this._watcher = config.watcher;
    this._config = config;
    if (config.profiles) {
      this._profiles = Object.keys(config.profiles);
    }
  }

  get name(): string {
    if (this._name) {
      return this._name;
    }

    return `${this.baseDir}`;
  }

  set name(name: string) {
    this._name = name;
  }

  setConfigValidator(configValidator: ConfigValidator) {
    this._configValidator = configValidator;
  }

  setWatcherService(watcherService: WatcherService) {
    this._watcherService = watcherService;
  }

  getAvaliableProfiles(): string[] {
    return this._profiles || [];
  }

  createWatcher() {
    this._watcherService.create(this.baseDir, this._watcher);
  }

  getFileSystem(): Promise<FileSystem> {
    return createRemoteIfNoneExist(getHostInfo(this.getConfig()));
  }

  disposeFileSystem() {
    return removeRemote(getHostInfo(this.getConfig()));
  }

  getConfig(): any {
    const config = this._config;
    const copied = Object.assign({}, config);
    delete copied.profiles;

    // remove the './' part from a relative path
    copied.remotePath = upath.normalize(config.remotePath);

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

    return copied;
  }

  dispose() {
    this._watcherService.dispose(this.baseDir);
    this.disposeFileSystem();
  }
}
