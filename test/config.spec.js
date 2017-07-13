const Joi = require('joi');

const nullable = schema => schema.optional().allow(null);

const configScheme = {
  host: Joi.string().required(),
  port: Joi.number().integer(),
  username: Joi.string().required(),
  password: nullable(Joi.string()),
  protocol: Joi.any().valid('sftp', 'ftp'),
  agent: nullable(Joi.string()),
  privateKeyPath: nullable(Joi.string()),
  passphrase: nullable(Joi.string()),
  passive: Joi.boolean().optional(),
  interactiveAuth: Joi.boolean().optional(),

  remotePath: Joi.string().required(),
  uploadOnSave: Joi.boolean().optional(),

  syncMode: Joi.any().valid('update', 'full'),

  watcher: Joi.object().keys({
    files: Joi.string().allow(false, null).optional(),
    autoUpload: Joi.boolean().optional(),
    autoDelete: Joi.boolean().optional(),
  }).optional(),

  ignore: Joi.array().min(0).items(Joi.string()),
};

describe("validation config", () => {
  test("default config", () => {
    const config = {
      host: 'host',
      port: 22,
      username: 'username',
      password: null,
      protocol: 'sftp',
      agent: null,
      privateKeyPath: null,
      passphrase: null,
      passive: false,
      interactiveAuth: false,
    
      remotePath: '/',
      uploadOnSave: false,
    
      syncMode: 'update',
    
      watcher: {
        files: false,
        autoUpload: false,
        autoDelete: false,
      },
    
      ignore: [
        '**/.vscode',
        '**/.git',
        '**/.DS_Store',
      ],
    };

    const result = Joi.validate(config, configScheme, {
      convert: false,
    });
    expect(result.error).toBe(null);
  });

  test("partial config", () => {
    const config = {
      host: 'host',
      port: 22,
      username: 'username',
      protocol: 'sftp',
    
      remotePath: '/',
    
      syncMode: 'update',
    
      watcher: {},
    
      ignore: [
        '**/.vscode',
        '**/.git',
        '**/.DS_Store',
      ],
    };

    let result = Joi.validate(config, configScheme, {
      convert: false,
    });
    expect(result.error).toBe(null);

    delete config.watcher;
    result = Joi.validate(config, configScheme, {
      convert: false,
    });
    expect(result.error).toBe(null);
  });

  describe("key validaiton", () => {
    test("protocol must be one of ['sftp', 'ftp']", () => {
      const config = {
        host: 'host',
        port: 22,
        username: 'username',
        protocol: 'unknown',
        passive: false,
        interactiveAuth: false,
      
        remotePath: '/',
        uploadOnSave: false,
      
        syncMode: 'update',
      
        watcher: {
          files: false,
          autoUpload: false,
          autoDelete: false,
        },
      
        ignore: [
          '**/.vscode',
          '**/.git',
          '**/.DS_Store',
        ],
      };

      const result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).not.toBe(null);
    });

    test("watcher files must be false or string", () => {
      const config = {
        host: 'host',
        port: 22,
        username: 'username',
        protocol: 'sftp',
        passive: false,
        interactiveAuth: false,
      
        remotePath: '/',
        uploadOnSave: false,
      
        syncMode: 'update',
      
        watcher: {
          files: false,
          autoUpload: false,
          autoDelete: false,
        },
      
        ignore: [
          '**/.vscode',
          '**/.git',
          '**/.DS_Store',
        ],
      };

      let result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).toBe(null);

      config.watcher.files = '**/*.js';
      result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).toBe(null);

      config.watcher.files = null;
      result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).toBe(null);

      config.watcher.files = true;
      result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).not.toBe(null);

      delete config.watcher;
      result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).toBe(null);
    });

    test("ignore must be an array of string", () => {
      const config = {
        host: 'host',
        port: 22,
        username: 'username',
        protocol: 'sftp',
        passive: false,
        interactiveAuth: false,
      
        remotePath: '/',
        uploadOnSave: false,
      
        syncMode: 'update',
      
        watcher: {
          files: false,
          autoUpload: false,
          autoDelete: false,
        },
      
        ignore: [
          1,
          '**/.git',
          '**/.DS_Store',
        ],
      };

      let result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).not.toBe(null);

      config.ignore = [];
      result = Joi.validate(config, configScheme, {
        convert: false,
      });
      expect(result.error).toBe(null);
    });
  });
});
