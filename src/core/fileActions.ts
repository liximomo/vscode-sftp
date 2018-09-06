// import FileSystem, { FileStats, FileType } from './Fs/FileSystem';
// import { transferFile, transferSymlink } from './fileTransfer';
// import { FileTask } from './fileTransferTask';

// const ACTION_TRANSFORM = 'transform';
// const ACTION_OPERATE = 'operate';
// const ACTION_OPERATE_REMOVE = 'operate.remove';

// export enum TargetType {
//   LOCAL,
//   REMOTE,
//   BOTH,
// }

// interface FileInfo {
//   fsPath: string;
//   fileType: FileType;
//   status?: FileStats;
// }

// interface FileAction {
//   type: string;
//   localFile: FileInfo;
// }

// interface FileTransferTask extends FileAction {
//   remoteFile: FileInfo;
// }

// interface FileOperateTask extends FileAction {
//   remoteFile?: FileInfo;
//   target: TargetType;
//   operate: string;
// }

// type Handle = (action: FileAction, ctx: any) => void;
// interface HandlerMap {
//   [x: string]: Handle;
// }

// function createActionHanler(handlers: HandlerMap, key: string): Handle {
//   return (action, ctx) => {
//     if (handlers.hasOwnProperty(action[key])) {
//       return handlers[action[key]](action, ctx);
//     }
//   };
// }

// export function transfer(localFile: FileInfo, remoteFilePath: string): FileTransferTask {
//   return {
//     type: ACTION_TRANSFORM,
//     localFile,
//     remoteFile: {
//       fsPath: remoteFilePath,
//       fileType: localFile.fileType,
//     },
//   };
// }

// export function removeRemoteFile(filePath: string, fileType: FileType): FileOperateTask {
//   return {
//     type: ACTION_OPERATE,
//     localFile: {
//       fsPath: filePath,
//       fileType,
//     },
//     target: TargetType.REMOTE,
//     operate: ACTION_OPERATE_REMOVE,
//   };
// }

// export default createActionHanler(
//   {
//     [ACTION_TRANSFORM](action: FileTransferTask, ctx) {
//       const { localFS, remoteFS, option } = ctx;
//       const { fileType, fsPath } = action.localFile;
//       const { fsPath: targetFsPath } = action.remoteFile;
//       switch (fileType) {
//         case FileType.File:
//           return transferFile(fsPath, targetFsPath, localFS, remoteFS, option);
//         case FileType.SymbolicLink:
//           return transferSymlink(fsPath, targetFsPath, localFS, remoteFS, option);
//         default:
//           return Promise.resolve();
//       }
//     },
//     // [ACTION_OPERATE]: createActionHanler(
//     //   {
//     //     ACTION_OPERATE_REMOVE() {},
//     //   },
//     //   'operate'
//     // ),
//   },
//   'type'
// );
