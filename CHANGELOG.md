## [0.6.8] - 2017-06-09
### Enhance
* Activate the extension only when it needs to. You must have the vscode greater than 1.13.0.

## [0.6.7] - 2017-06-07
### Enhance
* Keeping active so you don't have to reload vscode to active sftp when create config file at the first time.

## [0.6.6] - 2017-06-06
### Bugfix
* Window can't auto create dir non-existing.

## [0.6.2] - 2017-06-05
### Bugfix
* Incorrectly config not found error popup.

## [0.6.1] - 2017-06-03
### Bugfix
* Don't watch file when there is no .sftpConfig file.

## [0.6.0] - 2017-06-02
### Feature
* support ftp(since the current popular node-ftp library doesn't work perfectly, Be optimistic！)

### Feedback
* more debug info

### Bugfix
* fix `SFTPFileSystem.rmdir` doesn't resolve correctly.
* disable watcher on pulling files.
* make true re-conncet when it need to.

## [0.5.4] - 2017-05-30
### Feedback
* Better error log
* output debug info in sftp output channel

### Bugfix
* fix some files missed uploading when they has updated because of throttle.

## [0.5.3] - 2017-05-26
### Feature
* AutoSave now works even in external file update!🎉🎉🎉
* A new configuration `watcher`. Now there is a way to perceive external file change(create, delete).

## [0.5.2] - 2017-05-22
### Bugfix
* Running a command through shortcut couldn't find active document correctly.

### Feedback
* Show path that is relative to the workspace root instead of full path on status bar.

## [0.5.1] - 2017-05-22
### Enhance
* Provide a way to run command at the workspace root

## [0.5.0] - 2017-05-19
### Feature
* Keep ssh conncet alive (re conncet only when needed)

## [0.4.12] - 2017-05-18
### Bugfix
* Fix binary file upload

## [0.4.11] - 2017-05-18
### Feedback
* Better status indication

## [0.4.10] - 2017-05-18
### Bugfix
* Config file not found in windows
* Check existence of privateKeyPath

## [0.4.0] - 2017-05-17
### Config
* Add option `syncModel`

### Command
* New command Upload
* New command Download
