# `winston-azure-blob`

> An Azure Blob transport for winston3

[![NPM](https://img.shields.io/npm/v/winston-azure-blob?style=for-the-badge)](https://www.npmjs.com/package/winston-azure-blob)

## Highlights

-   :heavy_check_mark: **Simple API** - Easy to use API with sensible defaults
-   :large_blue_circle: **Typescript ready**
-   :closed_lock_with_key: **SAS support** - Use a shared access signature or key/name auth
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
  import { winstonAzureBlob, logger, extensions } from "winston-azure-blob";

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
        },
        blobName: "The name of the blob",
        bufferLogSize : 1,
        containerName: "A container name",
        eol : "\n",
        extension : extensions.LOG
        level: "info",
        rotatePeriod : "YYYY-MM-DD",
        syncTimeout : 0,
      })
    ]
  });

  logger.warn("Hello!");
```

## API

-   **account** Azure storage account credentials
    -   **account.name:** The name of the Windows Azure storage account to use
    -   **account.key:** The access key used to authenticate into this storage account
    -   or
    -   **account.host:** http address of storage account
    -   **account.sasToken:** shared access signature of storage account
-   **blobName:** The name of the blob to log
-   **bufferLogSize:** A minimum number of logs before syncing the blob, set to 1 if you want to sync at each log
-   **containerName:** The container which will contain the logs
-   **eol:** The character append to each log (By default, a carriage return)
-   **extension:** The file extension for the log file. Omit for no file extension. Currently the only extension supported is ".log" via `extensions`
-   **level:** Log level of messages for the transport (defaults to `info`).
-   **rotatePeriod:** A moment format ex: YYYY-MM-DD will generate blobName.2000.01.01
-   **syncTimeout:** The maximum time between two sync calls. Set to zero for realtime logging

## Inspo & Credit

<https://github.com/sdnetwork/winston3-azureblob-transport>
