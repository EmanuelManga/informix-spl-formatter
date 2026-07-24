"use strict";

const vscode = require("vscode");
const { formatInformixSpl } = require("./formatter");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = {
    /**
     * @param {vscode.TextDocument} document
     * @returns {vscode.TextEdit[]}
     */
    provideDocumentFormattingEdits(document) {
      const config = vscode.workspace.getConfiguration();
      const uppercase = config.get("sql-formatter.uppercase", true);
      const indentSize = config.get("informixSpl.indentSize", 2);
      const useTabs = config.get("informixSpl.useTabs", false);
      const blankAfterQuery = config.get("informixSpl.blankAfterQuery", true);
      const blankAfterIf = config.get("informixSpl.blankAfterIf", true);
      const blankAfterReturning = config.get(
        "informixSpl.blankAfterReturning",
        true
      );
      const blankBeforeElseEndIf = config.get(
        "informixSpl.blankBeforeElseEndIf",
        true
      );
      const keepEndClosersTogether = config.get(
        "informixSpl.keepEndClosersTogether",
        true
      );

      const text = document.getText();
      const formatted = formatInformixSpl(text, {
        uppercase,
        indentSize,
        useTabs,
        blankAfterQuery,
        blankAfterIf,
        blankAfterReturning,
        blankBeforeElseEndIf,
        keepEndClosersTogether,
      });

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );

      return [vscode.TextEdit.replace(fullRange, formatted)];
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("sql", provider)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
