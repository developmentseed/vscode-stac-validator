import * as vscode from "vscode";

interface StacDocument {
  stac_version?: string;
  type?: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Ready to automatically validate STAC via json-schema");

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId === "json") {
        updateJsonSchemaForDocument(event.document);
      }
    }
  );

  const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (document.languageId === "json") {
        updateJsonSchemaForDocument(document);
      }
    }
  );

  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "json") {
      updateJsonSchemaForDocument(document);
    }
  });

  context.subscriptions.push(documentChangeDisposable, documentOpenDisposable);
}

function updateJsonSchemaForDocument(document: vscode.TextDocument): void {
  const config = vscode.workspace.getConfiguration("stacJsonSchema");
  const enabled = config.get<boolean>("enable", true);

  if (!enabled) {
    return;
  }

  try {
    const text = document.getText();

    if (!text.includes('"stac_version"')) {
      return;
    }

    const jsonData: StacDocument = JSON.parse(text);

    if (!jsonData.stac_version) {
      return;
    }

    const stacType = jsonData.type?.toLowerCase() || "unknown";
    const schemaUrl = getSchemaUrl(jsonData.stac_version, stacType);

    if (schemaUrl) {
      applySchemaToDocument(document, schemaUrl);
    }
  } catch (error) {
    console.debug("Failed to parse JSON document:", error);
  }
}

function getSchemaUrl(stacVersion: string, stacType: string): string | null {
  return `https://schemas.stacspec.org/v${stacVersion}/${stacType}/schema.json`;
}

function applySchemaToDocument(
  document: vscode.TextDocument,
  schemaUrl: string
): void {
  const config = vscode.workspace.getConfiguration("json");
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
