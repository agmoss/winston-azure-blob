# `winston-azure-blob`

> An Azure Blob transport for winston3

[![NPM](https://img.shields.io/npm/v/winston-azure-blob?style=for-the-badge)](https://www.npmjs.com/package/winston-azure-blob)

## Highlights

-   :heavy_check_mark: **Simple API** - Easy to use API with sensible defaults
-   :large_blue_circle: **Typescript ready**
-   :closed_lock_with_key: **SAS support** - Use a Shared Access Signature or key/name auth
-   :wrench: **Highly configurable** - Lots of options for customization in specific use cases
-   :cloud: **Modern** - Uses the new [`@azure/storage-blob`](https://www.npmjs.com/package/@azure/storage-blob) SDK

## Installation

```bash
yarn install winston
yarn install winston-azure-blob
```

## Usage

```typescript
import * as winston from "winston";
import { winstonAzureBlob, extensions } from "winston-azure-blob";

const logger = winston.createLogger({
  format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.splat(),
      winston.format.json()
  ),
  transports: [
    winstonAzureBlob({
      account: {
        name: "Azure storage account sub domain ([A-Za-z0-9])",
        key: "The long Azure storage secret key"
        // or
        host: 'The host address',
        sasToken: 'The Shared Access Signature token'
        // or
        connectionString: 'A connection string for the storage account'
      },
      blobName: "The name of the blob",
      bufferLogSize : 1,
      containerName: "A container name",
      eol : "\n",
      extension : extensions.LOG,
      level: "info",
      rotatePeriod : "YYYY-MM-DD",
      syncTimeout : 0,
    })
  ]
});

logger.warn("Hello!");
```

## API

| Parameter       | Data Type              | Description                                                                                                         | Default           | Type/Options                                     |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------ |
| `account`       | Object                 | Azure storage account credentials. Can provide either `name` & `key`, `host` & `sasToken`, or a `connectionString`. |                   | See below                                        |
| `blobName`      | String                 | The name of the blob to log.                                                                                        |                   |                                                  |
| `bufferLogSize` | Integer                | A minimum number of logs before syncing the blob.                                                                   | -1                |                                                  |
| `containerName` | String                 | The container which will contain the logs.                                                                          |                   |                                                  |
| `eol`           | String                 | The character appended to each log.                                                                                 | "\n"              |                                                  |
| `extension`     | String                 | The file extension for the log file.                                                                                | No file extension | `.log` via `extensions` or string file extension |
| `headers`       | Array<String>          | Column headers for csv log files. Headers, when provided, are applied to newly created csv blobs.                   |                   |                                                  |
| `level`         | String                 | Log level of messages for the transport.                                                                            | `info`            |                                                  |
| `rotatePeriod`  | String (formatted)     | A moment format for blob name generation. Ex: `YYYY-MM-DD` will generate `blobName.2000.01.01`.                     | ""                |                                                  |
| `syncTimeout`   | Integer (milliseconds) | The maximum time between two sync calls. Set to zero for realtime logging.                                          | 0                 |                                                  |

### Account Credentials Options:

| Field              | Data Type | Description                                          |
| ------------------ | --------- | ---------------------------------------------------- |
| `name`             | String    | Name of the Windows Azure storage account to use.    |
| `key`              | String    | Access key to authenticate into the storage account. |
| `host`             | String    | HTTP address of the storage account.                 |
| `sasToken`         | String    | Shared access signature of the storage account.      |
| `connectionString` | String    | A connection string for the storage account.         |

## Inspo & Credit

<https://github.com/sdnetwork/winston3-azureblob-transport>
