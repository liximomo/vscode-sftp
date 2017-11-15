# sftp sync extension for VS Code
Very simple and intuitive and works.

## Features

* support multi-root workspace
* dual authentication
* sync directory to remote
* sync directory to local
* download file/directory to local
* upload file/directory to remote
* upload to remote on save
* multiple file format support(file, directory, symbolic link)
* multiple config(anywhere under workspace)

## Usage
1. `Ctrl+Shift+P` on Windows/Linux open command palette, run `SFTP: config` command.
2. Run command on editor context menu or explorer context menu.

*Note1* ：A command must run with a target(file or directory). When Running command within command palette it will ask you to select a folder.

*Note2* ：Sync commands will only be available to a directory. Try not to bind shortcut to those commands because there is no way to figure out the target directory.

### Command
| Command              | Description                                 |
| -------------------- |---------------------------------------------|
| SFTP: Config         | create a new config file at workspace root  |
| SFTP: Upload         | upload file/directory                       |
| SFTP: Download       | download file/directory                     |
| SFTP: Sync To Remote | sync local directory to remote              |
| SFTP: Sync To Local  | sync remote directory to local              |
  
### Glossary
`config root`: The directory where the `.vscode/sftp.json` file is located in.

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

  /**
   * string - Path to ssh-agent's UNIX socket for ssh-agent-based user authentication.
   * Windows users: set to 'pageant' for authenticating with Pageant or (actual) path to a cygwin "UNIX socket.
   */
  agent: null, 
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
   *    |-.vscode/sftp.json.json
   *  
   *  config file 
   *    {
   *      ...
   *      remotePath: '/home/test',
   *      ...
   *    }
   *    
   *  run command 'sync to remote' at `e.txt` will result that is /b/d/e.txt => /home/test/d/e.txt
   *  procedure:
   *    {config file path} => /b/.sftp-config.json
   *    {local file path} => /b/d/e.txt
   *    {local Path relative to `config root`} => d/e.txt
   *    {configed remotePath} => '/home/test'
   *    {final remotePath} => '/home/test/d/e.txt'
   *    that is /b/d/e.txt => /home/test/d/e.txt
   */ 
  remotePath: "./", 
  uploadOnSave: false,


  /**
   *  available value: update | full
   *  update: sync existing files only
   *  full: sync existing files, remove deleted files, add missing files
   *  if you want to sync existing files and add missing files, use the "upload" command!
   */ 
  syncMode: 'update',

// FIXMEEEEEEE: creating/deleting a file locally in vscode doesn't automatically make changes on the server unless the watcher is on? New files get created on either side only when syncing to that side and using syncMode full. Same with deletions.
// FIXMEEE what's the difference between Download and Sync to local? And between Upload and Sync to remote?

  /**
   *  glob pattern that will be appended to `config root` and `remotePath`
   *  FIXMEEEEEEE explain the ** - what does it mean, when to put it and when not
   */ 
  ignore: [
    "**/.vscode/**",
    "**/.git/**",
    "**/.DS_Store"
  ],


  /**
   *  Watching external file changes(create and remove only). Such as compile/build output or git branch switching.
   *  Watcher will be disabled when files is set to false or both autoDelete and autoUpload are set to false,
   */
  watcher: {
    // available value: false or glob pattern
    // false: disable watcher
    // glob pattern: same logic as ignore
    // FIXMEEEEEEE: same logic means it *ignores* files that match the pattern, or *selects* files that match the pattern?
    // FIXMEEEEEEE the value of files is not an array like in ignore, but a string!
    files: false, 

    // available value: true or false
    // whether or not to auto upload created files
    autoUpload: true,

    // available value: true or false
    // whether or not to auto delete removed files
    autoDelete: true,
  }

}
```

-----------------------------------------------------------------------------------------------------------

## Known Issues

### Issue
ENFILE: file table overflow ...
### Solution
MacOS has a harsh limit on the number of open files. Run these commands:
```bash
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
ulimit -n 65536
```
