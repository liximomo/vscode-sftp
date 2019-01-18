import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as sshConfig from 'ssh-config';
import app from '../app';
import logger from '../logger';
import { getUserSetting } from '../host';
import { replaceHomePath, resolvePath } from '../helper';
import { SETTING_KEY_REMOTE } from '../constants';
import upath from './upath';
import Ignore from './ignore';
import { FileSystem } from './fs';
import Scheduler from './scheduler';
import { createRemoteIfNoneExist, removeRemoteFs } from './remoteFs';
import TransferTask from './transferTask';
import localFs from './localFs';

const DEFAULT_SSHCONFIG_FILE = '~/.ssh/config';

interface Host {
  host: string;
  port: number;
  connectTimeout: number;
  username: string;
  password: string;

  agent?: string;

  privateKeyPath?: string;
  passphrase: string | true;
  interactiveAuth: boolean;
  algorithms: any;

  secure: boolean | 'control' | 'implicit';
  secureOptions: any;
}

interface WatcherConfig {
  files: false | string;
  autoUpload: boolean;
  autoDelete: boolean;
}

interface ServiceOption {
  name: string;
  protocol: string;
  context: string;
  remotePath: string;
  uploadOnSave: boolean;
  downloadOnOpen: boolean | 'confirm';
  concurrency: number;

  watcher: WatcherConfig;
  syncOption: {
    delete: boolean;
    skipCreate: boolean;
    ignoreExisting: boolean;
    update: boolean;
  };
  remoteTimeOffsetInHours: number;
  remoteExplorer?: {
    filesExclude?: string[];
  };
}

export interface FileServiceConfig extends Host, ServiceOption {
  profiles?: {
    [x: string]: FileServiceConfig;
  };

  remote?: string;
  sshConfigPath?: string;

  ignore: string[];
  ignoreFile: string;
}

export interface ServiceConfig extends Host, ServiceOption {
  ignore?: ((fsPath: string) => boolean) | null;
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

function filesIgnoredFromConfig(config: FileServiceConfig): string[] {
  const cache = app.ignoreFileCache;
  const ignore: string[] = config.ignore && config.ignore.length ? config.ignore : [];

  const ignoreFile = config.ignoreFile;
  if (!ignoreFile) {
    return ignore;
  }

  let ignoreFromFile;
  if (cache.has(ignoreFile)) {
    ignoreFromFile = cache.get(ignoreFile);
  } else if (fs.existsSync(ignoreFile)) {
    ignoreFromFile = fs
      .readFileSync(ignoreFile)
      .toString()
      .split(/\r?\n/g);
    cache.set(ignoreFile, ignoreFromFile);
  } else {
    throw new Error(`File ${ignoreFile} not found. Check your config of "ignoreFile"`);
  }

  return ignore.concat(ignoreFromFile);
}

function getHostInfo(config) {
  const ignoreOptions = [
    'name',
    'remotePath',
    'uploadOnSave',
    'downloadOnOpen',
    'ignore',
    'ignoreFile',
    'watcher',
    'concurrency',
    'syncOption',
    'sshConfigPath',
  ];

  return Object.keys(config).reduce((obj, key) => {
    if (ignoreOptions.indexOf(key) === -1) {
      obj[key] = config[key];
    }
    return obj;
  }, {});
}

function chooseDefaultPort(protocol) {
  return protocol === 'ftp' ? 21 : 22;
}

function setConfigValue(config, key, value) {
  if (config[key] === undefined) {
    if (key === 'port') {
      config[key] = parseInt(value, 10);
    } else {
      config[key] = value;
    }
  }
}

function mergeConfigWithExternalRefer(config: FileServiceConfig): FileServiceConfig {
  const copyed = Object.assign({}, config);

  if (config.remote) {
    const remoteMap = getUserSetting(SETTING_KEY_REMOTE);
    const remote = remoteMap.get(config.remote);
    if (!remote) {
      throw new Error(`Can\'t not find remote "${config.remote}"`);
    }
    const remoteKeyMapping = new Map([['scheme', 'protocol']]);

    const remoteKeyIgnored = new Map([['rootPath', 1]]);

    Object.keys(remote).forEach(key => {
      if (remoteKeyIgnored.has(key)) {
        return;
      }

      const targetKey = remoteKeyMapping.has(key) ? remoteKeyMapping.get(key) : key;
      setConfigValue(copyed, targetKey, remote[key]);
    });
  }

  if (config.protocol !== 'sftp') {
    return copyed;
  }

  const sshConfigPath = replaceHomePath(config.sshConfigPath || DEFAULT_SSHCONFIG_FILE);
  let content;
  try {
    content = fs.readFileSync(sshConfigPath, 'utf8');
  } catch (error) {
    logger.warn(error.message, `load ${sshConfigPath} failed`);
    return copyed;
  }

  const parsedSSHConfig = sshConfig.parse(content);
  const section = parsedSSHConfig.find({
    Host: copyed.host,
  });

  if (section === null) {
    return copyed;
  }

  const mapping = new Map([
    ['HostName', 'host'],
    ['Port', 'port'],
    ['User', 'user'],
    ['IdentityFile', 'privatekey'],
    ['ServerAliveInterval', 'keepalive'],
    ['ConnectTimeout', 'connTimeout'],
  ]);

  section.config.forEach(line => {
    const key = mapping.get(line.param);

    if (key !== undefined) {
      // don't need consider config priority, always set to the resolve host.
      if (key === 'host') {
        copyed[key] = line.value;
      } else {
        setConfigValue(copyed, key, line.value);
      }
    }
  });

  return copyed;
}

function getCompleteConfig(config: FileServiceConfig, workspace: string): FileServiceConfig {
  const mergedConfig = mergeConfigWithExternalRefer(config);

  return mergedConfig;
}

enum Event {
  BEFORE_TRANSFER = 'BEFORE_TRANSFER',
  AFTER_TRANSFER = 'AFTER_TRANSFER',
}

let id = 0;

export default class FileService {
  private _eventEmitter: EventEmitter = new EventEmitter();
  private _name: string;
  private _watcherConfig: WatcherConfig;
  private _profiles: string[];
  private _pendingTransferTasks: Set<TransferTask> = new Set();
  private _schedulers: Scheduler[] = [];
  private _config: FileServiceConfig;
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

  constructor(baseDir: string, workspace: string, config: FileServiceConfig) {
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

  getPendingTransferTasks(): TransferTask[] {
    return Array.from(this._pendingTransferTasks);
  }

  isTransferring() {
    return this._schedulers.length > 0;
  }

  cancelTransferTasks() {
    // keep th order so "onIdle" can be triggered.
    // 1, remove tasks not start
    this._schedulers.forEach(s => s.empty());
    this._schedulers.length = 0;

    // 2. cancel running task
    this._pendingTransferTasks.forEach(t => t.cancel());
    this._pendingTransferTasks.clear();
  }

  beforeTransfer(listener: (task: TransferTask) => void) {
    this._eventEmitter.on(Event.BEFORE_TRANSFER, listener);
  }

  afterTransfer(listener: (err: Error | null, task: TransferTask) => void) {
    this._eventEmitter.on(Event.AFTER_TRANSFER, listener);
  }

  createTransferScheduler(concurrency): TransferScheduler {
    const self = this;
    const scheduler = new Scheduler({
      autoStart: false,
      concurrency,
    });
    this._storeScheduler(scheduler);

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
            self._removeScheduler(scheduler);
            return resolve();
          }

          scheduler.onIdle(() => {
            self._removeScheduler(scheduler);
            resolve();
          });
          scheduler.start();
        });
      },
    };
  }

  getLocalFileSystem(): FileSystem {
    return localFs;
  }

  getRemoteFileSystem(config: ServiceConfig): Promise<FileSystem> {
    return createRemoteIfNoneExist(getHostInfo(config));
  }

  getConfig(): ServiceConfig {
    const config = this._config;
    const afterApplyProfile = Object.assign({}, config) as any;
    delete afterApplyProfile.profiles;

    const hasProfile = config.profiles && Object.keys(config.profiles).length > 0;
    if (hasProfile && app.state.profile) {
      logger.info(`Using profile: ${app.state.profile}`);
      const profile = config.profiles![app.state.profile];
      if (!profile) {
        throw new Error(
          `Unkown Profile "${app.state.profile}".` +
            ' Please check your profile setting.' +
            ' You can set a profile by running command `SFTP: Set Profile`.'
        );
      }
      Object.assign(afterApplyProfile, profile);
    }

    // validate config
    const error = this._configValidator && this._configValidator(afterApplyProfile);
    if (error) {
      let errorMsg = `Config validation fail: ${error.message}.`;
      // tslint:disable-next-line triple-equals
      if (hasProfile && app.state.profile == null) {
        errorMsg += ' Maybe you should set a profile first.';
      }
      throw new Error(errorMsg);
    }

    return this._resolveServiceConfig(getCompleteConfig(afterApplyProfile, this.workspace));
  }

  dispose() {
    this._disposeWatcher();
    this._disposeFileSystem();
  }

  private _resolveServiceConfig(fileServiceConfig: FileServiceConfig): ServiceConfig {
    const workspace = this.workspace;
    const serviceConfig: ServiceConfig = fileServiceConfig as any;

    if (serviceConfig.port === undefined) {
      serviceConfig.port = chooseDefaultPort(serviceConfig.protocol);
    }

    if (serviceConfig.protocol === 'ftp') {
      serviceConfig.concurrency = 1;
    }

    // remove the './' part from a relative path
    serviceConfig.remotePath = upath.normalize(serviceConfig.remotePath);
    if (serviceConfig.privateKeyPath) {
      serviceConfig.privateKeyPath = resolvePath(workspace, serviceConfig.privateKeyPath);
    }

    if (fileServiceConfig.ignoreFile) {
      fileServiceConfig.ignoreFile = resolvePath(workspace, fileServiceConfig.ignoreFile);
      serviceConfig.ignore = this._createIgnoreFn(fileServiceConfig);
    }

    // convert ingore config to ignore function
    if (serviceConfig.agent && serviceConfig.agent.startsWith('$')) {
      const evnVarName = serviceConfig.agent.slice(1);
      const val = process.env[evnVarName];
      if (!val) {
        throw new Error(`Environment variable "${evnVarName}" not found`);
      }
      serviceConfig.agent = val;
    }

    return serviceConfig;
  }

  private _storeScheduler(scheduler: Scheduler) {
    this._schedulers.push(scheduler);
  }

  private _removeScheduler(scheduler: Scheduler) {
    const index = this._schedulers.findIndex(s => s === scheduler);
    if (index !== -1) {
      this._schedulers.splice(index, 1);
    }
  }

  private _createIgnoreFn(config: FileServiceConfig): ServiceConfig['ignore'] {
    const localContext = this.baseDir;
    const remoteContext = config.remotePath;

    const ignoreConfig = filesIgnoredFromConfig(config);
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

  // fixme: remote all profiles
  private _disposeFileSystem() {
    return removeRemoteFs(getHostInfo(this.getConfig()));
  }
}
