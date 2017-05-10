# sftp sync extension for VS Code
I wrote this because i must to. All others can't fit my requirement.
## Features

* sync file/directory to remote
* sync file/directory to local
* sync to remote on save
* multiple config

## Usage
 1. `Ctrl+Shift+P` on Windows/Linux open command palette, run `SFTP: config` command.
 2. use `Sync To Local` or `Sync To Remote` commnad on editor context menu or explorer context menu.

## config
```js
{
  host: "host",
  port: 22,
  username: "username",
  password: "password",
  protocol: "sftp", // current only support sftp
  privateKeyPath: null, // absolute path to user private key
  passphrase: null,

  /**
   * the final remotePath of select file or directory is {local file Path relative to config file path} + {remotePath in config file}.
   * example:
   *
   * dirctory structure
   *  |-a
   *    |-c.txt
   *  |-b
   *    |-d
   *      |-e.txt
   *    |-.sftp-config.json
   *  
   *  config file 
   *    {
   *      ...
   *      remotePath: '/home/test',
   *      ...
   *    }
   *    
   *  run command 'sync to remote' to file with result
   *  {config file path} => /b/.sftp-config.json
   *  {local file path} => /b/d/e.txt
   *  {local Path relative to config file path} => d/e.txt
   *  {configed remotePath} => '/home/test'
   *  {final remotePath} => '/home/test/d/e.txt'
   *  that is /b/d/e.txt => /home/test/d/e.txt
   */ 
  remotePath: "./", 
  uploadOnSave: false,

  /**
   *  relative or absolute(start with '/') glob pattern
   *  relative path will resolve to {directory path  which config file place} + {relative path}
   */ 
  ignore: [
    "/**/.vscode",
    "/**/.git",
    "/**/.DS_Store"
  ]
}
```

## Release Notes

### 0.0.1

Initial release.

-----------------------------------------------------------------------------------------------------------

## TO-DO:

- [ ] better feedback
- [ ] only upload file which is out of date
- [ ] eslint
