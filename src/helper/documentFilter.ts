import { Uri, TextDocument } from 'vscode';

export function isValidFile(uri: Uri) {
  return uri.scheme === 'file';
}

export function isValidDocument(doc: TextDocument) {
  return isValidFile(doc.uri);
}
