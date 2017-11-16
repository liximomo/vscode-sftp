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
| `SFTP: Sync To Remote` | sync local directory to remote               | only available for directories. Copies all files from local dir to remote, overwriting destination. |
| `SFTP: Sync To Local`  | sync remote directory to local               | same as above, but in the opposite direction|
  
*Note3* : FIXMEEE difference between sync to local/download etc etc

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

// FIXMEEEEEEE: creating/deleting a file locally in vscode doesn't automatically make changes on the server unless the watcher is on? 
//New files get created on either side only when syncing to that side and using syncMode full. Same with deletions.


// FIXMEEE what's the difference between Download and Sync to local? And between Upload and Sync to remote?

/*
The download is a copy operation. And I think it's clear how sync works that I explained in above question. I will give you a more detail example.

According to these two directories.

source-dir
   |- s1.txt
dest-dir
    |-d1.txt
    |-d2.txt
When you download source-dir to dest-dir the dest-dir will be

dest-dir
    |-d1.txt
    |-d2.txt
    |-s1.txt
Back to starting point. When you sync source-dir to dest-dir with syncMode: 'update'. Nothing changes, because there are no files in common.

source-dir
   |- s1.txt
dest-dir
    |-d1.txt
    |-d2.txt
when you sync source-dir to dest-dir with syncMode: 'full'.

source-dir
   |- s1.txt
dest-dir
    |-s1.txt
The two directory will be exactly same.

if the remote and local dir contain the same files, Sync to local behaves just like Download?
Sync to local is equal to download only when the local and remote dir are exactly same.
// syncMode: 'update'
source-dir
   |- s1.txt
   |- s2.txt
dest-dir
    |-s1.txt
    |-d1.txt

// after sync to dest
dest-dir
    |-s1.txt
    |-d1.txt

// after download to dest
dest-dir
    |-s1.txt
    |- s2.txt
    |-d1.txt
When downloading, uploading and syncing, does your extension do any kind of check for the differences between files, or it just copies them from one side to the other, overwriting the destination?
It just overwrites the destination?
*/

  /**
   *  array of glob patterns that will be appended to `config root` and `remotePath`
   *  the ** sequence matches a sequence of zero or more files and directories
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
   *  Watching external file changes(create and remove only). Such as compile/build output or git branch switching.
   *  Watcher will be disabled when files is set to false or both autoDelete and autoUpload are set to false
   */
  watcher: {
    /**
    *  available value: false or a glob pattern
    *   - false: disable watcher
    *   - string containing a glob pattern: describes files that will pe watched
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
