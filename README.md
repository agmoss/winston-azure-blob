# winston3-azureblob-transport
An Azure Blob transport for winston3

## Installation

``` bash
  $ npm install winston
  $ npm install winston3-azureblob-transport
```

## Usage
``` js
  var winston = require("winston");
  var azureBlobTransport = require("winston3-azureblob-transport");

  var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
      new (azureBlobTransport)({
        account: {
          name: "Azure storage account sub domain ([A-Za-z0-9])",
          key: "The long Azure storage secret key"
        },
        containerName: "A container name",
        blobName: "The name of the blob",
        level: "info",
        bufferLogSize : 1,
        syncTimeout : 0,
        rotatePeriod : "",
        eol : "\n"
      })
    ]
  });
  
  logger.warn("Hello!");
```

The AzureBlob transport accepts the following options :

* __level:__ Level of messages that this transport should log (defaults to `info`).
* __account.name:__ The name of the Windows Azure storage account to use
* __account.key:__ The access key used to authenticate into this storage account
* __blobName:__ The name of the blob to log.
* __containerName:__ The container which will contain the logs.
* __eol:__ The character append to each log (By default a carriage return)
* __rotatePeriod:__ A moment format ex : YYYY-MM-DD will generate blobName.2000.01.01
* __bufferLogSize:__ A minimum number of logs before sync the blob, set to 1 if you want sync at each log.
* __syncTimeout:__ The maximum time between two sync, set to zero if you don't want 

## Inspiration
https://github.com/Parsimotion/winston-azure-blob-transport
