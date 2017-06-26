# sftp sync extension for VS Code
Very simple and intuitive and works.

## Features

* dual authentication
* sync directory to remote
* sync directory to local
* download file/directory to local
* upload file/directory to local
* upload to remote on save
* multiple file format support(file, direcotry, symbolic link)
* multiple config(anywhere under workspace)

## Usage
1. `Ctrl+Shift+P` on Windows/Linux open command palette, run `SFTP: config` command.
2. Run commnad on editor context menu or explorer context menu.

*Note1* ：A commnad must run with a target(file or directory). When Running command within command palette will result in target be workspace root.

*Note2* ：Sync commands will only avaliable to a directory. Try not to bind shortcut to those commands becasue there is no way to firgut out the target direcotry.

### Command
| Command              | describe                                    |
| -------------------- |---------------------------------------------|
| SFTP: Config         | create a new config file at workspace root  |
| SFTP: Upload         | upload file/directory                       |
| SFTP: Download       | download file/directory                     |
| SFTP: Sync To Remote | sync local directory to remote              |
| SFTP: Sync To Local  | sync remote directory to local              |
  
### Glossary
`config root`: Full pathname of the directory which you put config file put in

**config root**: 

**config root**: 

## config
```js
// default config
{
  host: "host",
  port: 22,
  username: "username",
  password: "password",
  protocol: "sftp", // sftp or ftp
  privateKeyPath: null, // absolute path to user private key
  passphrase: null,
  passive: false, // ftp passive mode

  // try interactive authentication, useful for dual auth. (requires the server has keyboard-interactive enabled)
  interactiveAuth: true, 

  /**
   * The final remotePath of select file or directory is {remotePath in config file} + {local file Path relative to `config root`}.
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
   *  {local Path relative to `config root`} => d/e.txt
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
   *  glob pattern that will be append to `config root` and `remotePath`
   */ 
  ignore: [
    "**/.vscode",
    "**/.git",
    "**/.DS_Store"
  ],

  /**
   *  Watching external file changes. Such as compile/build output or git branch switching.
   *  Watcher will be disable when files set to null or both autoDelete and autoUpload set to false,
   */
  watcher: {
    // avaliable value: null | glob patternv
    // null: disable watcher
    // glob pattern: same logic as ignore
    files: null, 

    // avaliable value: true or false
    // whether or not auto upload created files
    autoUpload: true,

    // avaliable value: true or false
    // whether or not auto delete removed files
    autoDelete: true,
  }

}
```

-----------------------------------------------------------------------------------------------------------

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
