## Error: Failure

The failure error message comes from the remote side and is more or less the default/generic error message that SSH' sftp server sends when a syscall fails or similar. To know what exactly is going wrong you could try to enable debug output for the sftp server and then execute your transfers again and see what (if anything) shows up in the logs there.

### Solution One
Change `remotePath` to the actual path if it's a symlink.

### Solution Two
The problem would be that your server runs out of file descriptors. You should try to increase the file descriptors limit. If you don't have the permission to do this, set [limitOpenFilesOnRemote](https://github.com/liximomo/vscode-sftp/wiki/Config#limitopenfilesonremote) option in your config.

## ENFILE: file table overflow ...

MacOS have a harsh limit on number of open files.

### Solution

Run those command

```
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
ulimit -n 65536
```
