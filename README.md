# `winston-azure-blob`

> An Azure Blob transport for winston3

[![NPM](https://img.shields.io/npm/v/winston-azure-blob?style=for-the-badge)](https://www.npmjs.com/package/winston-azure-blob)

## Highlights

-   Simple API
-   Typescript ready
-   SAS support
-   Highly configurable
-   Uses the new [`@azure/storage-blob`](https://www.npmjs.com/package/@azure/storage-blob) SDK

## Installation

```bash
yarn install winston
yarn install winston-azure-blob
```

## Usage

```typescript
  import * as winston from "winston";
  import { winstonAzureBlob, logger, extension } from "winston-azure-blob";

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
        containerName: "A container name",
        blobName: "The name of the blob",
        level: "info",
        bufferLogSize : 1,
        syncTimeout : 0,
        rotatePeriod : "YYYY-MM-DD",
        eol : "\n",
        extension : extensions.LOG
      })
    ]
  });

  logger.warn("Hello!");
```

## API

-   **level:** Log level of messages for the transport (defaults to `info`).
-   **account** Azure storage account credentials
    -   **account.name:** The name of the Windows Azure storage account to use
    -   **account.key:** The access key used to authenticate into this storage account
    -   or
    -   **account.host:** http address of storage account
    -   **account.sasToken:** shared access signature of storage account
-   **blobName:** The name of the blob to log
-   **containerName:** The container which will contain the logs
-   **eol:** The character append to each log (By default, a carriage return)
-   **rotatePeriod:** A moment format ex: YYYY-MM-DD will generate blobName.2000.01.01
-   **bufferLogSize:** A minimum number of logs before syncing the blob, set to 1 if you want to sync at each log
-   **syncTimeout:** The maximum time between two sync calls. Set to zero for realtime logging
-   **extension:** The file extension for the log file. Omit for no file extension. Currently the only extension supported is ".log" via `extensions`

## Inspo & Credit

<https://github.com/sdnetwork/winston3-azureblob-transport>
