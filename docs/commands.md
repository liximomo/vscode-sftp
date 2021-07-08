# Commands

## SFTP: Config

Create a new configuration file for a project.

## Set Profile

Set the current profile.

## SFTP: Upload Active File

Upload the current file.

## SFTP: Upload Changed Files

Upload all files changed or created since the last commit to Git.

## SFTP: Upload Active Folder

Upload the entire folder the current file is located in.

## SFTP: Download Active File

Download the remote version of the current file and overwrite the local copy.

## SFTP: Download Active Folder

Download the entire folder the current file is located in.

## SFTP: Sync Local -> Remote

1. Any files that exist on both local and remote that have a different timestamp between local
   and remote are copied over.
2. Any files that only exist on the local are copied over.

You can change the default behavior with `syncOption`.

## SFTP Sync Remote -> Local

Same as `Sync Local -> Remote`, but in the opposite direction.

## SFTP: Sync Both Directions

Compares file modification times, and will always perform the action that causes the newest file to be present
in both locations.

*Only `skipCreate` and `ignoreExisting` are valid for this command.*

## SFTP: List Active Folder

List the folder the current file is located in.

## sftp.upload

Upload files or folders.

## Cancel All Transfers

Stop the current transfers (upload and download).

## Open SSH in Terminal

Open a terminal in VSCode and auto login to a specific server.
