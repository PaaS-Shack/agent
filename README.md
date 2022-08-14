![Moleculer logo](https://moleculer.services/images/banner.png)

# Agent

Moleculer agent to remotly run services/agents.

# Features
- Node tty
- FS
- GIT

# Install

```bash
$ git clone https://github.com/PaaS-Shack/agent.git
$ cd agent
$ npm i
$ node agent.js 
$ node console.js
```

# Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");


const broker = new ServiceBroker();


broker.start()

// Get node hearbeat
.then(() => broker.call("v1.node.heartbeat", {}))
//Tests a user's permissions for the file or directory specified by path.
.then(() => broker.call("v1.node.fs.access", {
    path:'/root'
}))

```

# Settings

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |


# Actions

## `v1.node.heartbeat`

Detailed infomation about the node.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |

### Results
**Type:** `<Object>`

## `v1.node.ping`

Broker ping from current node.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |

### Results
**Type:** `<Object>`

## `v1.node.cmd`

Find entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `cmd` | `String` | **required** | Shell command to run. |
| `cwd` | `String` | __dirname | Current working directory.  |

### Results
**Type:** `<Object>`
| Property | Type | Description |
| -------- | ---- | ----------- |
| `stdout` | `String` | stdout output of the child process. |
| `stderr` | `String` | stderr output of the child process.  |


## `v1.node.heartbeat`

Find entities by query.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `populate` | `String`, `Array.<String>` | **required** | Populated fields. |
| `fields` | `String`, `Array.<String>` | **required** | Fields filter. |
| `limit` | `Number` | - | Max count of rows. |
| `offset` | `Number` | - | Count of skipped rows. |
| `sort` | `String` | - | Sorted fields. |
| `search` | `String` | - | Search text. |
| `searchFields` | `String`, `Array.<String>` | **required** | Fields for searching. |
| `query` | `Object` | - | Query object. Passes to adapter. |

### Results
**Type:** `Array.<Object>`
