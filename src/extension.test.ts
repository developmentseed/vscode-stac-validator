import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("json.schemas config is updated when STAC file is opened", async () => {
    const fixturesPath = path.join(__dirname, "..", "src", "test", "fixtures");
    const stacFilePath = path.join(fixturesPath, "sample-item.json");

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(stacFilePath),
    );
    await vscode.window.showTextDocument(document);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const config = vscode.workspace.getConfiguration("json");
    const schemas = config.get<Array<any>>("schemas", []);

    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    const schemaEntry = schemas.find((schema) => {
      if (schema.fileMatch) {
        return schema.fileMatch.some(
          (pattern: string) => pattern === relativePath,
        );
      }
      return false;
    });

    assert.ok(schemaEntry, "Schema entry should exist for STAC file");
    assert.ok(
      schemaEntry.url.includes("schemas.stacspec.org"),
      "Schema URL should point to STAC spec",
    );
    assert.ok(
      schemaEntry.url.includes("/item.json"),
      "Schema URL should be for an item",
    );

    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  });
});
