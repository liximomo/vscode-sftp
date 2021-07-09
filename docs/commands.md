# Commands

## SFTP: Config
Create a new config file for a project.

## Set Profile
Set the current profile.
           
### KeyBindings Args
func(profileName: string)

## SFTP: Upload Active File
Upload the current file.

## SFTP: Upload Changed Files
Upload all files changed or created since the last commit to your Git.

## SFTP: Upload Active Folder
Upload the entire folder the current file is located in.

## SFTP: Download Active File
Download the remote version of the current file and overwrite the local copy.

## SFTP: Download Active Folder
Download the entire folder the current file is located in.

## SFTP: Sync Local -> Remote
1. Any files that exist on both local and remote that have a different timestamp between local and remote are copied over.
2. Any files that only exist on the local are copied over.

You can change the default behavior by [syncOption](https://github.com/Natizyskunk/vscode-sftp/wiki/Config#syncoption).

## SFTP: Sync Remote -> Local
Same as `Sync Local -> Remote`, but in the opposite direction.

## SFTP: Sync Both Directions
Compare file modification times, and will always perform the action that causes the newest file to be present in both locations.

*Only [skipCreate](https://github.com/Natizyskunk/vscode-sftp/wiki/Config#syncoptionskipcreate) and [ignoreExisting](https://github.com/Natizyskunk/vscode-sftp/wiki/Config#syncoptionignoreexisting) are valid for this command.*

## SFTP: List Active Folder
List the folder the current file is located in.

## sftp.upload
Upload file or folders.

### KeyBindings Args
func(fspaths: string[])

## sftp.download
Download file or folders.

### KeyBindings Args
func(fspaths: string[])

## Cancel All Transfers
Stop the current transfers (upload and download).

## Open SSH in Terminal
Open a terminal in VSCode and auto login to a specific server.

***

# Alt Commands
An alternative command can be found when pressing `Alt` while opening a menu.

## Force Download
Download file but disregard ignore rules.

## Force Upload
Upload file but disregard ignore rules.
