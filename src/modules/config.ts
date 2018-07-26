import * as fse from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as Joi from 'joi';
import * as sshConfig from 'ssh-config';
import { CONFIG_PATH } from '../constants';
import reportError from '../helper/reportError';
import Trie from '../core/Trie';
import { showTextDocument } from '../host';
import logger from '../logger';
import appState from './appState';

const configTrie = new Trie(
  {},
  {
    delimiter: path.sep,
  }
);

const nullable = schema => schema.optional().allow(null);

const configScheme = {
  name: Joi.string(),

  context: Joi.string(),
  protocol: Joi.any().valid('sftp', 'ftp', 'local'),

  host: Joi.string().required(),
  port: Joi.number().integer(),
  connectTimeout: Joi.number().integer(),
  username: Joi.string().required(),
  password: nullable(Joi.string()),

  agent: nullable(Joi.string()),
  privateKeyPath: nullable(Joi.string()),
  passphrase: nullable(Joi.string().allow(true)),
  interactiveAuth: Joi.boolean().optional(),
  algorithms: Joi.any(),

  secure: Joi.any()
    .valid(true, false, 'control', 'implicit')
    .optional(),
  secureOptions: nullable(Joi.object()),
  passive: Joi.boolean().optional(),

  remotePath: Joi.string().required(),
  uploadOnSave: Joi.boolean().optional(),
  downloadOnOpen: Joi.boolean()
    .optional()
    .allow('confirm'),
  syncMode: Joi.any().valid('update', 'full'),
  ignore: Joi.array()
    .min(0)
    .items(Joi.string()),
  watcher: {
    files: Joi.string()
      .allow(false, null)
      .optional(),
    autoUpload: Joi.boolean().optional(),
    autoDelete: Joi.boolean().optional(),
  },
  concurrency: Joi.number().integer(),
};

const defaultConfig = {
  // common
  name: undefined,
  remotePath: './',
  uploadOnSave: false,
  downloadOnOpen: false,
  syncMode: 'update',
  ignore: [],
  watcher: {
    files: false,
    autoUpload: false,
    autoDelete: false,
  },
  concurrency: 4,

  protocol: 'sftp',

  // server common
  host: undefined,
  port: 22,
  username: undefined,
  password: undefined,
  connectTimeout: 10 * 1000,

  // sftp
  agent: undefined,
  privateKeyPath: undefined,
  passphrase: undefined,
  interactiveAuth: false,
  algorithms: undefined,
  sshConfigPath: '~/.ssh/config',

  // ftp
  secure: false,
  secureOptions: undefined,
  passive: false,
};

function normalizeTriePath(pathname) {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const device = pathname.substr(0, 2);
    if (device.charAt(1) === ':') {
      // lowercase drive letter
      return pathname[0].toLowerCase() + pathname.substr(1);
    }
  }

  return path.normalize(pathname);
}

function normalizeHomePath(pathname) {
  return pathname.substr(0, 2) === '~/' ? path.join(os.homedir(), pathname.slice(2)) : pathname;
}

async function extendConfig(config) {
  const protocol = config.protocol;

  const merged = {
    ...defaultConfig,
    port: protocol === 'ftp' ? 21 : 22, // override default port by protocol
    ...config,
  };

  if (merged.agent && merged.agent.startsWith('$')) {
    const evnVarName = merged.agent.slice(1);
    const val = process.env[evnVarName];
    if (!val) {
      throw new Error(`Environment variable "${evnVarName}" not found`);
    }
    merged.agent = val;
  }

  const sshConfigPath = normalizeHomePath(merged.sshConfigPath);
  if (protocol !== 'sftp' || !sshConfigPath) {
    return merged;
  }

  let content;
  try {
    content = await fse.readFile(sshConfigPath, 'utf8');
  } catch {
    return merged;
  }

  const parsedSSHConfig = sshConfig.parse(content);
  const section = parsedSSHConfig.find({
    Host: merged.host,
  });

  if (section === null) {
    return merged;
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
      merged[key] = line.value;
    }
  });

  // convert to integer
  merged.port = parseInt(merged.port, 10);

  return merged;
}

function logConfig(config) {
  const copy = {};
  const privated = ['username', 'password', 'passphrase'];
  Object.keys(config).forEach(key => {
    const configValue = config[key];
    // tslint:disable-next-line triple-equals
    if (privated.indexOf(key) !== -1 && configValue != undefined) {
      copy[key] = '******';
    } else {
      copy[key] = configValue;
    }
  });
  logger.info(`config at ${config.context}`, copy);
}

async function addConfig(config, defaultContext) {
  if (config.defaultProfile) {
    appState.profile = config.defaultProfile;
  }

  const extendedConfig = await extendConfig(config);
  // tslint:disable triple-equals
  const context = extendedConfig.context != undefined ? extendedConfig.context : defaultContext;
  extendedConfig.context = normalizeTriePath(path.resolve(defaultContext, context));
  if (extendedConfig.privateKeyPath) {
    extendedConfig.privateKeyPath = normalizeHomePath(extendedConfig.privateKeyPath);
  }
  configTrie.add(extendedConfig.context, extendedConfig);

  logConfig(extendedConfig);

  return extendedConfig;
}

function normalizeConfig(config) {
  const result = { ...config };

  const hasProfile = config.profiles && Object.keys(config.profiles).length > 0;
  if (hasProfile && appState.profile) {
    const profile = config.profiles[appState.profile];
    if (!profile) {
      throw new Error(
        `Unkown Profile "${appState.profile}".` +
          ' Please check your profile setting.' +
          ' You can set a profile by running command `SFTP: Set Profile`.'
      );
    }

    Object.assign(result, profile);
    delete result.profiles;
  }

  // validate config
  const { error: validationError } = Joi.validate(result, configScheme, {
    allowUnknown: true,
    convert: false,
    language: {
      object: {
        child: '!!prop "{{!child}}" fails because {{reason}}',
      },
    },
  });
  if (validationError) {
    let errorMsg = `Config validation fail: ${validationError.message}.`;
    if (hasProfile && appState.profile == null) {
      errorMsg += ' Maybe you should set a profile first.';
    }
    throw new Error(errorMsg);
  }

  return result;
}

export function getConfigPath(basePath) {
  return path.join(basePath, CONFIG_PATH);
}

export function loadConfig(configPath) {
  // $todo? trie per workspace, so we can remove unused config
  return fse.readJson(configPath).then(config => {
    const configs = Array.isArray(config) ? config : [config];
    const configContext = path.resolve(configPath, '../../');
    return Promise.all(configs.map(cfg => addConfig(cfg, configContext)));
  });
}

export function initConfigs(basePath): Promise<Array<{}>> {
  const configPath = getConfigPath(basePath);
  return fse.pathExists(configPath).then(
    exist => {
      if (exist) {
        return loadConfig(configPath);
      }
      return [];
    },
    _ => []
  );
}

export function getConfig(activityPath: string) {
  const config = configTrie.findPrefix(normalizeTriePath(activityPath));
  if (!config) {
    throw new Error(`(${activityPath}) config file not found`);
  }

  return normalizeConfig(config);
}

export function getAllRawConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.getAllValues();
}

export function getAllConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.getAllValues().map(normalizeConfig);
}

export function getShortestDistinctConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.findValuesWithShortestBranch();
}

export function newConfig(basePath) {
  const configPath = getConfigPath(basePath);

  return fse
    .pathExists(configPath)
    .then(exist => {
      if (exist) {
        return showTextDocument(configPath);
      }

      return fse
        .outputJson(
          configPath,
          {
            protocol: defaultConfig.protocol,
            host: defaultConfig.host,
            username: defaultConfig.username,
            remotePath: defaultConfig.remotePath,
          },
          { spaces: 4 }
        )
        .then(() => showTextDocument(configPath));
    })
    .catch(reportError);
}

export function getHostInfo(config) {
  const ignoreOptions = [
    'name',
    'remotePath',
    'uploadOnSave',
    'downloadOnOpen',
    'syncMode',
    'ignore',
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
