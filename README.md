# pluto-template (contracts)

The contracts of a product, versioned in one place: the HTTP contract of the BFF and the schema of the webview bridge, with the golden vectors and conformance tests generated from it.

| Path | What it holds |
| --- | --- |
| `contracts/openapi.yaml` | the OpenAPI contract the BFF implements (generate its interface from it) and the web and mobile clients read |
| `contracts/bridge-schema.json` | the bridge schema, version 1: five messages, each with a direction |
| `contracts/generated/` | the golden vectors and one conformance test per language, written by `pluto contracts generate` |

Rename the placeholder `pluto-template` (the package name in `package.json` and this title) to the name of your product repository.

```
npm ci && npm test           # the schema compiles, the contract has an operation, the vectors agree with the schema
pluto contracts generate     # after changing contracts/bridge-schema.json; add --codecs to write the three codecs
pluto contracts check        # fails on a generated file that differs from the schema
```

Rules: a change to either contract starts here, in a pull request that the consumers review; an optional field is a minor change and removing or retyping a field needs a new version (`contracts/bridge-schema.json` `version`). The workflow `contract` validates both files and compares the OpenAPI contract with the base branch for breaking changes.
