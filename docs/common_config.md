# Common Configuration

## name
*string*: A string to identify your configuration.

## context
*string*: A relative path to the workspace root folder.  Use this when you want to map a subfolder
to the `remotePath`.

**Default**: the workspace root.

## protocol
*string*: `sftp` or `ftp`

**Default**: `sftp`

## host
*string*: Hostname or IP address of the server.

## port
*integer*: The SFTP/FTP port number of the server.

**Default**: 22

## username
*string*: Username for authentication.

## password
*string*: The password for password-based user authentication (**note: this is stored as plain-text**).

## remtoePath
*string*: The absolute path on the remote host.

**Default**: `/`

## uploadOnSave
*boolean*: Upload on every save operation of VSCode.

**Default**: false

## useTempFile
*boolean*: Upload temp file on every save operation of VSCode to avoid breaking a webpage when a user acceses it 
while the file is still being uploaded (is incomplete).

**Default**: false

## downloadOnOpen
*boolean*: Download the file from the remote server whenever it is opened.

**Default**: false

## syncOption
*object*: Configure the behavior of the `Sync` command.

**Default**: `{}`

## syncOption.delete
*boolean*: Delete extraneous files from destination directories.

## syncOption.skipCreate
*boolean*: Skip creating new files on the destination.

## syncOption.ignoreExisting
*boolean*: Skip updating files that exist on the destination.

## syncOption.update
*boolean*: Update the destination only if a newer version is on the source filesystem.

## ignore
*string[]*: Same behavior as gitignore, all paths relative to context of the current configuration.

**Default**: []

## ignoreFile
*string*: Absolute path to the ignore file or relative path relative to the workspace root folder.

## watcher
*object*.

## watcher.files
*string*: Glob patterns that are watched and when edited outside of the VSCode editor are processed.
Set `uploadOnSave` to false when you watch everything.

## watcher.autoUpload
*boolean*: Upload when the file changed.

## watcher.autoDelete
*boolean*: Delete when the file is removed.

## remoteTimeOffsetInHours
*number*: The number of hours difference between the local machine and the remote server. (remote minus local)

**Default**: 0

## remtoeExplorer
*object*.

## remoteExplorer.fileExclude
*string[]*: Configure that patterns for excluding files and folders.  The Remote Explorer decides which files and folders
to show or hide based on this setting.

## concurrency
*number*: Lowering the concurrency could get more stability because some clients/servers have some sort
of configured/hard coded limit.

**Default**: 4

## connectTimeout
*number*: The maximum connection time.

**Default**: 10000

## limitOpenFilesOnRemote
*mixed*: Limit open file descriptors to the specific number in a remote server.  Set to true for using
default `limit(222)`.  Do not set this unless you have to.

**Default**: false
