import * as vscode from "vscode";

interface StacDocument {
  stac_version?: string;
  type?: string;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId === "json") {
        processStacDocument(event.document, statusBarItem);
      }
    }
  );

  const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (document.languageId === "json") {
        processStacDocument(document, statusBarItem);
      }
    }
  );

  const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && editor.document.languageId === "json") {
        processStacDocument(editor.document, statusBarItem);
      } else {
        statusBarItem.hide();
      }
    }
  );

  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "json") {
      processStacDocument(document, statusBarItem);
    }
  });

  // Update status bar for currently active editor
  if (vscode.window.activeTextEditor) {
    processStacDocument(vscode.window.activeTextEditor.document, statusBarItem);
  }

  context.subscriptions.push(
    documentChangeDisposable,
    documentOpenDisposable,
    activeEditorDisposable
  );
}

function processStacDocument(
  document: vscode.TextDocument,
  statusBarItem: vscode.StatusBarItem
): void {
  const config = vscode.workspace.getConfiguration("stacJsonSchema");
  const enabled = config.get<boolean>("enable", true);

  if (!enabled) {
    statusBarItem.hide();
    return;
  }

  try {
    const text = document.getText();

    if (!text.includes('"stac_version"')) {
      statusBarItem.hide();
      return;
    }

    const jsonData: StacDocument = JSON.parse(text);

    if (!jsonData.stac_version || !jsonData.type) {
      statusBarItem.hide();
      return;
    }

    // Update JSON schema
    const jsonType = jsonData.type.toLowerCase();
    const schemaUrl = getSchemaUrl(jsonData.stac_version, jsonType);
    if (schemaUrl) {
      applySchemaToDocument(document, schemaUrl);
    }

    // Update status bar
    const stacType = jsonData.type === "Feature" ? "Item" : jsonData.type;
    statusBarItem.text = `STAC ${stacType} v${jsonData.stac_version}`;
    statusBarItem.show();
  } catch (error) {
    console.debug("Failed to parse JSON document:", error);
    statusBarItem.hide();
  }
}

function getSchemaUrl(stacVersion: string, jsonType: string): string | null {
  const stacType = jsonType === "feature" ? "item" : jsonType;
  return `https://schemas.stacspec.org/v${stacVersion}/${stacType}-spec/json-schema/${stacType}.json`;
}

function applySchemaToDocument(
  document: vscode.TextDocument,
  schemaUrl: string
): void {
  const config = vscode.workspace.getConfiguration("json", null);
  const schemas = config.get<Array<any>>("schemas", []);

  const documentUri = document.uri.toString();
  const existingSchemaIndex = schemas.findIndex((schema) => {
    if (schema.fileMatch) {
      return schema.fileMatch.some(
        (pattern: string) => pattern === documentUri
      );
    }
    return false;
  });

  const newSchemaEntry = {
    fileMatch: [documentUri],
    url: schemaUrl,
  };

  let updatedSchemas: Array<any>;
  if (existingSchemaIndex >= 0) {
    if (schemas[existingSchemaIndex].url !== schemaUrl) {
      updatedSchemas = [...schemas];
      updatedSchemas[existingSchemaIndex] = newSchemaEntry;
    } else {
      return;
    }
  } else {
    updatedSchemas = [...schemas, newSchemaEntry];
  }

  config.update(
    "schemas",
    updatedSchemas,
    vscode.ConfigurationTarget.Workspace
  );

  console.log(`Applied STAC schema to ${document.fileName}: ${schemaUrl}`);
}

export function deactivate() {}
