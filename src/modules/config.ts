import { CONFIG_PATH } from '../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as Joi from 'joi';
import reportError from '../helper/reportError';
import Trie from '../core/Trie';
import { showTextDocument } from '../host';
import logger from '../logger';

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
  name: null,

  protocol: 'sftp',

  host: 'host',
  port: 22,
  username: 'username',
  password: null,
  connectTimeout: 10000,

  agent: null,
  privateKeyPath: null,
  passphrase: null,
  interactiveAuth: false,

  secure: false,
  secureOptions: null,
  passive: false,

  // default to login dir
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

function addConfig(config, defaultContext) {
  const { error: validationError } = Joi.validate(config, configScheme, {
    convert: false,
    language: {
      object: {
        child: '!!prop "{{!child}}" fails because {{reason}}',
      },
    },
  });
  if (validationError) {
    throw new Error(`config validation fail: ${validationError.message}`);
  }

  // tslint:disable triple-equals
  let context = config.context != undefined ? config.context : defaultContext;
  context = normalizeTriePath(path.resolve(defaultContext, context));

  const withDefault = {
    ...defaultConfig,
    port: config.protocol === 'ftp' ? 21 : 22, // override default port by protocol
    ...config,
    context,
  };

  configTrie.add(context, withDefault);
  logger.info(`config at ${context}`, withDefault);
  return withDefault;
}

export function getConfigPath(basePath) {
  return path.join(basePath, CONFIG_PATH);
}

export function loadConfig(configPath) {
  // $todo trie per workspace, so we can remove unused config
  return fse.readJson(configPath).then(config => {
    const configs = [].concat(config);
    const configContext = path.resolve(configPath, '../../');
    return configs.map(cfg => addConfig(cfg, configContext));
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

  return config;
}

export function getAllConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.getAllValues();
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
  let privateKeyPath = config.privateKeyPath
  if (privateKeyPath.substr(0,2) === '~/') {
    privateKeyPath = path.join(os.homedir(), privateKeyPath.slice(2))
  }

  return {
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    connectTimeout: config.connectTimeout,

    // sftp
    agent: config.agent,
    privateKeyPath,
    passphrase: config.passphrase,
    interactiveAuth: config.interactiveAuth,
    algorithms: config.algorithms,

    // ftp
    secure: config.secure,
    secureOptions: config.secureOptions,
    passive: config.passive,
  };
}
