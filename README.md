# `winston-azure-blob`

> An Azure Blob transport for winston3

[![NPM](https://img.shields.io/npm/v/winston-azure-blob?style=for-the-badge)](https://www.npmjs.com/package/winston-azure-blob)

## Highlights

- Simple API
- Typescript ready
- SAS support
- Highly configurable
- Uses the new [`@azure/storage-blob`](https://www.npmjs.com/package/@azure/storage-blob) SDK

## Installation

``` bash
yarn install winston
yarn install winston-azure-blob
```

## Usage

```typescript
  import * as winston from "winston";
  import { winstonAzureBlob } from "winston-azure-blob";

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
        eol : "\n"
      })
    ]
  });
  
  logger.warn("Hello!");
```

## API

* __level:__ Log level of messages for the transport (defaults to `info`).
* __account.name:__ The name of the Windows Azure storage account to use
* __account.key:__ The access key used to authenticate into this storage account
* __blobName:__ The name of the blob to log
* __containerName:__ The container which will contain the logs
* __eol:__ The character append to each log (By default, a carriage return)
* __rotatePeriod:__ A moment format ex: YYYY-MM-DD will generate blobName.2000.01.01
* __bufferLogSize:__ A minimum number of logs before syncing the blob, set to 1 if you want to sync at each log
* __syncTimeout:__ The maximum time between two sync calls. Set to zero for realtime logging

## Inspo & Credit

<https://github.com/sdnetwork/winston3-azureblob-transport>
