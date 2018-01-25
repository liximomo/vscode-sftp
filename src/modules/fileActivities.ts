import { TextDocument } from 'vscode';
import { isValidDocument } from '../helper/documentFilter';

const openFiles = {

};

export default function traceFileActivities(vscode) {
  vscode.workspace.onDidOpenTextDocument((doc: TextDocument) => {
    if (!isValidDocument(doc)) {
      return ;
    }
  });

  vscode.workspace.onDidCloseTextDocument((doc: TextDocument) => {
    if (!isValidDocument(doc)) {
      return ;
    }
  });
}

export function getOpenedTextDoucuments() {
  return Object.keys(openFiles).map(key => openFiles[key]);
}
