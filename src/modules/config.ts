import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as Joi from 'joi';
import * as sshConfig from 'ssh-config';
import { CONFIG_PATH, SETTING_KEY_REMOTE } from '../constants';
import { reportError, replaceHomePath, resolvePath } from '../helper';
import { upath } from '../core';
import { showTextDocument, getUserSetting } from '../host';
import logger from '../logger';

const DEFAULT_SSHCONFIG_FILE = '~/.ssh/config';

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
  ignoreFile: Joi.string().optional(),
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
  // name: undefined,
  remotePath: './',
  uploadOnSave: false,
  downloadOnOpen: false,
  syncMode: 'update',
  ignore: [],
  // ignoreFile: undefined,
  // watcher: {
  //   files: false,
  //   autoUpload: false,
  //   autoDelete: false,
  // },
  concurrency: 4,

  protocol: 'sftp',

  // server common
  // host,
  // port: 22,
  // username,
  // password,
  connectTimeout: 10 * 1000,

  // sftp
  // agent,
  // privateKeyPath,
  // passphrase,
  interactiveAuth: false,
  // algorithms,

  // ftp
  secure: false,
  // secureOptions,
  passive: false,
};

function chooseDefaultPort(protocol) {
  return protocol === 'ftp' ? 21 : 22;
}

function setConfigValue(config, key, value) {
  if (config[key] === undefined) {
    config[key] = value;
  }
}

async function extendConfig(config) {
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

  const sshConfigPath = replaceHomePath(copyed.sshConfigPath || DEFAULT_SSHCONFIG_FILE);
  let content;
  try {
    content = await fse.readFile(sshConfigPath, 'utf8');
  } catch {
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
      setConfigValue(copyed, key, line.value);
    }
  });

  // convert to integer
  copyed.port = parseInt(copyed.port, 10);

  return copyed;
}

function maskConfig(config) {
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
  return copy;
}

async function processConfig(config, workspace) {
  let extendedConfig = await extendConfig(config);
  extendedConfig = {
    ...defaultConfig,
    port: chooseDefaultPort(extendedConfig.protocol), // override default port by protocol
    ...extendedConfig,
  };

  if (extendedConfig.protocol === 'ftp') {
    extendedConfig.concurrency = 1;
  }

  // remove the './' part from a relative path
  extendedConfig.remotePath = upath.normalize(extendedConfig.remotePath);
  if (extendedConfig.privateKeyPath) {
    extendedConfig.privateKeyPath = resolvePath(workspace, extendedConfig.privateKeyPath);
  }
  if (extendedConfig.ignoreFile) {
    extendedConfig.ignoreFile = resolvePath(workspace, extendedConfig.ignoreFile);
  }

  logger.info(`config at ${workspace}`, maskConfig(extendedConfig));

  return extendedConfig;
}

function getConfigPath(basePath) {
  return path.join(basePath, CONFIG_PATH);
}

export function validateConfig(config) {
  const { error } = Joi.validate(config, configScheme, {
    allowUnknown: true,
    convert: false,
    language: {
      object: {
        child: '!!prop "{{!child}}" fails because {{reason}}',
      },
    },
  });
  return error;
}

export function readConfigsFromFile(configPath, workspace): Promise<any[]> {
  // $todo? trie per workspace, so we can remove unused config
  return fse.readJson(configPath).then(config => {
    const configs = Array.isArray(config) ? config : [config];
    return Promise.all(configs.map(c => processConfig(c, workspace)));
  });
}

export function tryLoadConfigs(workspace): Promise<any[]> {
  const configPath = getConfigPath(workspace);
  return fse.pathExists(configPath).then(
    exist => {
      if (exist) {
        return readConfigsFromFile(configPath, workspace);
      }
      return [];
    },
    _ => []
  );
}

// export function getConfig(activityPath: string) {
//   const config = configTrie.findPrefix(normalizePath(activityPath));
//   if (!config) {
//     throw new Error(`(${activityPath}) config file not found`);
//   }

//   return normalizeConfig(config);
// }

export function newConfig(basePath) {
  const configPath = getConfigPath(basePath);

  return fse
    .pathExists(configPath)
    .then(exist => {
      if (exist) {
        return showTextDocument(vscode.Uri.file(configPath));
      }

      return fse
        .outputJson(
          configPath,
          {
            protocol: defaultConfig.protocol,
            host: 'localhost',
            port: chooseDefaultPort(defaultConfig.protocol),
            username: 'username',
            remotePath: '/',
          },
          { spaces: 4 }
        )
        .then(() => showTextDocument(vscode.Uri.file(configPath)));
    })
    .catch(reportError);
}
