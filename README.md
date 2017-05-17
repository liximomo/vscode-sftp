# sftp sync extension for VS Code
I wrote this because i must to. All others can't fit my requirements.
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
 2. use commnad on editor context menu or explorer context menu.

### Command
| Command              | describe                                    |
| -------------------- |---------------------------------------------|
| SFTP: Config         | create a new config file at workspace root  |
| SFTP: Upload         | upload file/directory                       |
| SFTP: Download       | download file/directory                     |
| SFTP: Sync To Remote | sync local directory to remote              |
| SFTP: Sync To Local  | sync remote directory to local              |
  

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
   *  full: sync exist file, remove deleted file, add missed file
   *  if you want sync exist file and add missed file, use "upload" commond!
   */ 
  syncMode: 'update',

  /**
   *  glob pattern
   *  path will be append directory path which config file place
   */ 
  ignore: [
    "**/.vscode",
    "**/.git",
    "**/.DS_Store"
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
