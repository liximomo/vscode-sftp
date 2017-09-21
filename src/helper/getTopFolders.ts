import * as vscode from 'vscode';

function isSubPath(source, target) {
  return source.startsWith(target);
}

function removeSubPath(paths) {
  const result = [];
  const sortedPaths = paths.sort((a, b) => b.length - a.length);
  for (let curIndex = 0; curIndex < sortedPaths.length; curIndex++) {
    const curPath = sortedPaths[curIndex];
    let isSub = false;
    for (let targetIndex = curIndex + 1; targetIndex < sortedPaths.length; targetIndex++) {
      const targetPath = sortedPaths[targetIndex];
      if (isSubPath(curPath, targetPath)) {
        isSub = true;
        break;
      }
    }

    if (!isSub) {
      result.push(curPath);
    }
  }
  return result;
}

export default function getTopFolders(workspacsFolders: vscode.WorkspaceFolder[]) {
  const paths = workspacsFolders.map(folder => folder.uri.fsPath);
  return removeSubPath(paths);
}
