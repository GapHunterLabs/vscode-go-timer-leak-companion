import * as vscode from 'vscode';
import { scan } from './scanner';
import { recordHit } from './reviewPrompt';

let diagnostics: vscode.DiagnosticCollection;

function refresh(context: vscode.ExtensionContext, document: vscode.TextDocument): void {
  if (document.languageId !== 'go' && !document.uri.path.endsWith('.go')) return;

  const hits = scan(document.getText());
  const result = hits.map((hit) => {
    const line = hit.line - 1;
    const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(
      range,
      "time.After(...) inside a select case is not garbage-collected until it fires -- a select in a loop leaks one Timer per iteration. Use time.NewTimer(...) plus an explicit/deferred .Stop() instead.",
      vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = 'Go Timer Leak Companion';
    recordHit(context, `${document.uri.toString()}:${line}`);
    return diagnostic;
  });
  diagnostics.set(document.uri, result);
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('goTimerLeakCompanion');
  context.subscriptions.push(diagnostics);

  vscode.workspace.textDocuments.forEach((document) => refresh(context, document));

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => refresh(context, document)),
    vscode.workspace.onDidChangeTextDocument((event) => refresh(context, event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
  );
}

export function deactivate(): void {
  diagnostics?.dispose();
}
