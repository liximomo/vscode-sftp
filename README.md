# sftp sync extension for VS Code
Very simple and intuitive and works.

## Features

* supports multi-root workspace
* dual authentication
* sync directory to remote
* sync directory to local
* download file/directory to local
* upload file/directory to remote
* upload to remote on save
* watch project directory for external changes and automatically update remote
* multiple file format support(file, directory, symbolic link)
* multiple config(anywhere under workspace)

## Usage
1. `Ctrl+Shift+P` on Windows/Linux open command palette, run `SFTP: config` command.
2. Run command on editor context menu or explorer context menu.

*Note1* ：A command must run with a target(file or directory). When Running command within command palette it will ask you to select a folder.

*Note2* ：Sync commands will only be available to a directory. Try not to bind shortcuts to those commands because there is no way to figure out the target directory.

### Commands
| Command              | Description                                  |Detailed description|
| -------------------- |----------------------------------------------|---------------|
| `SFTP: Config`         | create a new config file at workspace root  | - |
| `SFTP: Upload`         | upload file/directory                       | copies selected files from the local to the remote directory, overwriting the remote ones. Files that are only present on the remote side won't be affected. Files that are only present on the local side will be created remotely|
| `SFTP: Download`       | download file/directory                     | same as above, but in the opposite direction |
| `SFTP: Sync To Remote` | sync local directory to remote               | only available for directories. Copies common files (that exist on both soides) from local dir to remote, overwriting destination. If syncMode is set to full, files that exist only on the local side will be created remotely, and files that exist only on the remote side will be deleted|
| `SFTP: Sync To Local`  | sync remote directory to local               | same as above, but in the opposite direction|
  

### Glossary
`config root`: The directory where the `.vscode/sftp.json` file is located in.

**config root**: 

**config root**: 

## config
```js
// default config
{
  /************************
  * CONNECTION PARAMETERS *
  *************************
  
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

  // try interactive authentication, useful for dual auth. (requires the server to have keyboard-interactive authentication enabled)
  interactiveAuth: true, 

 /*******************************
 * SYNCING, UPLOAD AND DOWNLOAD *
 *******************************/
 
  /**
   * The final remotePath of a selected file or directory is {remotePath in config file} + {local file Path relative to `config root`}.
   * example:
   *
   * local directory structure:
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
   *  available values: update | full
   *  update: sync existing files only (it only affects files that exist on both sides)
   *  full: sync existing files + remove files deleted from the source and are still present at the destination + create files that exist on the source and are missing at the destination
   *  if you want just to sync existing files and add missing files, use the `upload` command!
   *  Note: this option only affects the `Sync to remote` and `Sync to local` commands, not `Download` or `Upload`
   */ 
  syncMode: 'update',

  /** detailed example of how sync/upload/download work. Assume we have the following directories:
  *
  * source-dir
  * |-s1.txt (file that exists only at source)
  * |-common.txt
  * dest-dir
  * |-d1.txt (file that exists only at destination)
  * |-common.txt (common file between source-dir and dest-dir)
  * 
  * DOWNLOAD and UPLOAD are copy operations from one side to the other. They only overwrite and create files on the destination, without deleting anything.
  *
  * If we download source-dir to dest-dir, the dest-dir will be:
  * dest-dir
  * |-s1.txt (copied from source)
  * |-d1.txt
  * |-common.txt (overwritten with the contents of the same file from source-dir)
  *
  * The effect of SYNC operations depends on the value of syncMode. With syncMode: 'update', only common files are copied from one side to the other. With syncMode: 'full', the destination will be modified to have the same set of files as the source (which implies deleting files that only exist on the destination and creating files that only exist at source).
  * 
  * If we sync source-dir to dest-dir using syncMode: 'update', dest-dir wil be:
  * dest-dir
  * |-d1.txt
  * |-common.txt (overwritten with the contents of the same file from source-dir)
  * 
  * If we sync source-dir to dest-dir using syncMode: 'full', dest-dir wil be:
  * dest-dir
  * |-s1.txt (created, because it didn't exist on destination)
  * |-common.txt (overwritten with the contents of the same file from source-dir)
  * and d1.txt is deleted because it didn't exist at source
  */


  /**
   *  array of glob patterns that will be appended to `config root` and `remotePath`
   *  Note: the ** sequence matches a sequence of zero or more files and directories
   *  examples: 
   *    "**/.vscode" means every file or directory with name .vscode, at any depth in the file tree
   *     'a/b/.vscode' matches
   *     'a/b/.vscode/c.txt' does NOT match
   *    "**/.vscode/**" means every file or directory under a .vscode directory, at any depth in the file tree
   *     'a/b/.vscode/c.txt' matches
   *     'a/b/.vscode/c/d.txt' matches
   *     'a/b/.vscode/e' matches
   */ 
  ignore: [
    "**/.vscode/**",
    "**/.git/**",
    "**/.DS_Store"
  ],


  /**
   *  Watching external file changes(create and remove only). Such as compile/build output or git branch switching. Also useful for automatically creating/deleting remote files when creating/deleting them in vscode
   *  Watcher will be disabled when files is set to false or both autoDelete and autoUpload are set to false
   */
  watcher: {
    /**
    *  available value: false or a glob pattern
    *   - false: disable watcher
    *   - string containing a glob pattern: describes files that will be watched
    */
    files: false, 

    /**
    *  available value: true or false
    *  whether or not to auto upload created files (e.g. created in vscode or other external apps)
    */
    autoUpload: true,

    /**
    *  available value: true or false
    *  whether or not to auto delete removed files (e.g. removed manually from vscode or the command line)
    */
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
