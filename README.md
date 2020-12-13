# project-api

JSON HTTP API for retrieving a `package.json` file from GitHub (and potentially other sources).

## API

### `GET /:service/:owner/:repo?ref=&path=`

Path params:

* `:service` - the service hosting the repo that contains the `package.json`. Currently only GitHub is supported ("gh").
* `:owner` - user or organisation name that owns the repo.
* `:repo` - repository name where the `package.json` lives.

Query params:

* `path` - path to the `package.json` file from the root of the repo (if not at root).
* `ref` - commitish or branch/tag name.

Response:

The `package.json` contents.
