# sftp sync extension for VS Code
I wrote this because i must to. All others can't fit my requirement.
## Features

* sync directory to remote
* sync directory to local
* download file/directory to local
* upload file/directory to local
* upload to remote on save
* multiple file format support(file, direcotry, symbolic link)
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
   *    |-.sftpConfig.json
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
   *  avaliable value: update | full
   *  update: sync exist file only
   *  full: sync exist file and remove none-exist file
   */ 
  syncMode: 'update',

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

-----------------------------------------------------------------------------------------------------------

## TO-DO:

- [ ] lint source code

## Known Issues

### Issue
ENFILE: file table overflow ...
### Solution
MacOS have a harsh limit on number of open files. Run those command
```bash
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
ulimit -n 65536
```
