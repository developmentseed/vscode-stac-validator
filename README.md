# vscode-stac-json-schema

A Visual Studio Code extension that automatically configures JSON schema validation for STAC (SpatioTemporal Asset Catalog) files.

## How It Works

This extension automatically validates your STAC JSON files against their corresponding JSON schemas. When you open a STAC file (Item, Collection, or Catalog), the extension:

1. Detects the STAC type and version from the JSON content
2. Determines the appropriate JSON schema URL based on the STAC specification
3. Modifies your workspace settings to associate the file with its schema
4. Enables real-time validation and IntelliSense for STAC properties

The extension updates the `json.schemas` configuration in your workspace settings (`.vscode/settings.json`) to map your STAC files to their official schemas, providing instant feedback on validation errors and helpful autocomplete suggestions.

## Features

- Automatic detection of STAC Items, Collections, and Catalogs
- Support for multiple STAC specification versions
- Real-time JSON schema validation
- IntelliSense support for STAC properties
- Workspace-specific schema configuration
