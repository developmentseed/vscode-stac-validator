import * as vscode from "vscode";

interface StacDocument {
  stac_version?: string;
  type?: string;
}

let currentSchemaUrls: string[] = [];

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "stacValidator.showSchemas";
  context.subscriptions.push(statusBarItem);

  const showSchemasCommand = vscode.commands.registerCommand(
    "stacValidator.showSchemas",
    () => {
      if (currentSchemaUrls.length === 0) {
        vscode.window.showInformationMessage("No STAC schemas applied");
        return;
      }

      const items = currentSchemaUrls.map((url) => ({
        label: url,
        detail: url.includes("https://schemas.stacspec.org") ? "Core" : "Extension",
      }));

      vscode.window.showQuickPick(items, {
        placeHolder: "Applied STAC schemas",
        canPickMany: false,
      });
    }
  );

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
        currentSchemaUrls = [];
      }
    }
  );

  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "json") {
      processStacDocument(document, statusBarItem);
    }
  });

  if (vscode.window.activeTextEditor) {
    processStacDocument(vscode.window.activeTextEditor.document, statusBarItem);
  }

  context.subscriptions.push(
    showSchemasCommand,
    documentChangeDisposable,
    documentOpenDisposable,
    activeEditorDisposable
  );
}

function processStacDocument(
  document: vscode.TextDocument,
  statusBarItem: vscode.StatusBarItem
): void {
  const config = vscode.workspace.getConfiguration("stacValidator");
  const validateExtensions = config.get<boolean>("validateExtensions", true);

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

    const jsonType = jsonData.type.toLowerCase();
    const schemaUrl = getSchemaUrl(jsonData.stac_version, jsonType);
    if (schemaUrl) {
      let schemaUrls = [schemaUrl];
      if (validateExtensions) {
        const extensions = (jsonData as any).stac_extensions;
        if (Array.isArray(extensions)) {
          schemaUrls = [...schemaUrls, ...extensions];
        }
      }
      applySchemasToDocument(document, schemaUrls);
      currentSchemaUrls = schemaUrls;
    }

    const stacType = jsonData.type === "Feature" ? "Item" : jsonData.type;
    statusBarItem.text = `STAC ${stacType} v${jsonData.stac_version}`;
    statusBarItem.tooltip = "Click to view applied schemas";
    statusBarItem.show();
  } catch (error) {
    console.debug("Failed to parse JSON document:", error);
    statusBarItem.hide();
    currentSchemaUrls = [];
  }
}

function getSchemaUrl(stacVersion: string, jsonType: string): string | null {
  const stacType = jsonType === "feature" ? "item" : jsonType;
  return `https://schemas.stacspec.org/v${stacVersion}/${stacType}-spec/json-schema/${stacType}.json`;
}

function applySchemasToDocument(
  document: vscode.TextDocument,
  schemaUrls: string[]
): void {
  const config = vscode.workspace.getConfiguration("json", null);
  const schemas = config.get<Array<any>>("schemas", []);
  const relativePath = vscode.workspace.asRelativePath(document.uri, false);

  const updatedSchemas = schemas.filter((entry) => {
    return !entry.fileMatch.includes(relativePath);
  });

  for (const schemaUrl of schemaUrls) {
    const newSchemaEntry = {
      fileMatch: [relativePath],
      url: schemaUrl,
    };
    updatedSchemas.push(newSchemaEntry);
  }

  config.update(
    "schemas",
    updatedSchemas,
    vscode.ConfigurationTarget.Workspace
  );

  console.log(
    `Applied JSON schema(s) to ${document.fileName}: ${schemaUrls.join(", ")}`
  );
}

export function deactivate() {}
