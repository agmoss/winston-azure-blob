import Transport from "winston-transport";
import * as async from "async";
import moment from "moment";
import { MESSAGE } from "triple-beam";
import Debug from "debug";
import {
    AppendBlobClient,
    BlobServiceClient,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";

const debug = Debug("winston-azure-blob");
const MAX_APPEND_BLOB_BLOCK_SIZE = 4 * 1024 * 1024;

/**
 * Azure storage account credential variants
 */
type Account =
    | { name: string; key: string }
    | { host: string; sasToken: string };

/**
 * File extensions for the log file. More can be added
 */
export enum extensions {
    LOG = ".log",
}
interface IWinstonAzureBlob {
    account: Account;
    azBlobClient: BlobServiceClient;
    blobName: string;
    buffer: Array<any>;
    bufferLogSize: number;
    containerName: string;
    eol: string;
    extension?: extensions;
    rotatePeriod: string;
    syncTimeout: number;
    timeoutFn: NodeJS.Timeout | null;
}

/**
 * Default options for AzureBlob
 */
export type ILoggerDefaults = Pick<
    IWinstonAzureBlob,
    | "account"
    | "blobName"
    | "bufferLogSize"
    | "containerName"
    | "eol"
    | "extension"
    | "rotatePeriod"
    | "syncTimeout"
>;

/**
 * Data to be logged
 */
type Data = Record<string, any>;

/**
 * Default options for constructing logger
 */
const loggerDefaults: ILoggerDefaults = {
    account: {
        key: "YOUR_ACCOUNT_KEY",
        name: "YOUR_ACCOUNT_NAME",
    },
    blobName: "YOUR_BLOBNAME",
    // due to limitation of 50K block in azure blob storage we add some params to avoid the limit
    bufferLogSize: -1, // A minimum number of logs before syncing the blob, set to 1 if you want to sync at each log
    containerName: "YOUR_CONTAINER",
    eol: "\n", // End of line character to concatenate log
    extension: undefined, // File extension for the log file
    rotatePeriod: "", // moment format to rotate log file
    syncTimeout: 0, // The maximum time between two sync calls. Set to zero for realtime logging
};

//
// Extend from `winston-transport` to take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class WinstonAzureBlob extends Transport implements IWinstonAzureBlob {
    account!: {
        key: string;
        name: string;
    };

    azBlobClient: BlobServiceClient;
    blobName: string;
    buffer: Array<any>;
    bufferLogSize: number;
    containerName: string;
    eol: string;
    extension: extensions | undefined;
    rotatePeriod: string;
    syncTimeout: number;
    timeoutFn: NodeJS.Timeout | null;

    constructor(
        opts: Transport.TransportStreamOptions & Partial<ILoggerDefaults>
    ) {
        super(opts);

        const options = { ...loggerDefaults, ...opts };

        this.isValidAccountOpts(options.account);

        this.azBlobClient = this.createAzBlobClient(options.account);
        this.blobName = options.blobName;
        this.buffer = [];
        this.bufferLogSize = options.bufferLogSize;
        this.containerName = options.containerName;
        this.eol = options.eol;
        this.extension = options.extension;
        this.rotatePeriod = options.rotatePeriod;
        this.syncTimeout = options.syncTimeout;
        this.timeoutFn = null;

        if (this.bufferLogSize > 1 && !this.syncTimeout) {
            throw new Error(
                "syncTimeout must be set, if there is a bufferLogSize"
            );
        }
    }

    /**
     * Util Method
     */
    private isValidAccountOpts(account_info: Account) {
        if ("key" in account_info) {
            if (
                typeof account_info.key !== "string" ||
                typeof account_info.name !== "string"
            ) {
                throw new Error(
                    `Azure account key/name must be string values, received key:${typeof account_info.key}, name:${typeof account_info.name} `
                );
            }
        } else {
            if (
                typeof account_info.host !== "string" ||
                typeof account_info.sasToken !== "string"
            ) {
                throw new Error(
                    `Azure account host/sasToken must be string values, received key:${typeof account_info.host}, name:${typeof account_info.sasToken} `
                );
            }
        }
    }

    /**
     * Util Method
     */
    static tackOnRotatePeriodToBlobName({
        blobName,
        rotatePeriod,
    }: Pick<IWinstonAzureBlob, "blobName" | "rotatePeriod">) {
        if (rotatePeriod) {
            return blobName + "." + moment().format(rotatePeriod);
        }
        return blobName;
    }

    /**
     * Util Method
     */
    static tackOnExtensionToBlobName({
        blobName,
        extension,
    }: Pick<IWinstonAzureBlob, "blobName" | "extension">) {
        if (extension) {
            return blobName + extension;
        }
        return blobName;
    }

    /**
     * Util Method
     * Create the name for the log file with user defined opts
     * @param blobName Base name for the log file
     * @param rotatePeriod moment format to rotate log file
     * @param extension File extension for the log file
     */
    static generateBlobName({
        blobName,
        extension,
        rotatePeriod,
    }: Pick<IWinstonAzureBlob, "blobName" | "extension" | "rotatePeriod">) {
        return WinstonAzureBlob.tackOnExtensionToBlobName({
            blobName: WinstonAzureBlob.tackOnRotatePeriodToBlobName({
                blobName,
                rotatePeriod,
            }),
            extension,
        });
    }

    private push(data: Data, callback: async.ErrorCallback<Error>) {
        if (data) {
            this.buffer.push(data);
        }
        if (
            this.bufferLogSize < 1 ||
            this.buffer.length >= this.bufferLogSize
        ) {
            this._logToAppendBlob(this.buffer, callback); // in this case winston buffer for us
            this.buffer = [];
        } else if (this.syncTimeout && this.timeoutFn === null) {
            this.timeoutFn = setTimeout(() => {
                const tasks = this.buffer.slice(0);
                this.buffer = [];
                this.timeoutFn = null; // as we can receive push again after timeout we must relaunch the timeout
                this._logToAppendBlob(tasks, () => {
                    debug("Finish to appendblock", tasks.length);
                });
            }, this.syncTimeout);
            callback();
        } else {
            // buffering
            callback();
        }
    }

    log(info: Data, callback: Function) {
        this.push(info, () => {
            this.emit("logged", info);
            callback();
        });
    }

    createAzBlobClient(account_info: Account) {
        if ("key" in account_info) {
            const sharedKeyCredential = new StorageSharedKeyCredential(
                account_info.name,
                account_info.key
            );

            return new BlobServiceClient(
                `https://${account_info.name}.blob.core.windows.net`,
                sharedKeyCredential
            );
        }

        return new BlobServiceClient(
            `${account_info.host}${account_info.sasToken}`
        );
    }

    private _chunkString(str: string, len: number) {
        const size = Math.ceil(str.length / len);
        const r = Array(size);
        let offset = 0;
        for (let i = 0; i < size; i++) {
            r[i] = str.substr(offset, len);
            offset += len;
        }
        return r;
    }

    private async _appendBlobOperation(
        appendBlobClient: AppendBlobClient,
        chunk: any,
        nextAppendBlock: async.ErrorCallback<Error>
    ) {
        try {
            await appendBlobClient.createIfNotExists();
            const result = await appendBlobClient.appendBlock(
                chunk,
                chunk.length
            );
            if (result.errorCode) {
                debug(result.errorCode, result);
            }
        } catch (err) {
            debug(err);
        } finally {
            nextAppendBlock();
        }
    }

    private _logToAppendBlob(
        tasks: Array<Data>,
        callback: async.ErrorCallback<Error>
    ) {
        debug("Try to appendblock", tasks.length);
        // nothing to log
        if (tasks.length === 0) {
            return callback();
        }
        const azClient = this.azBlobClient;
        const containerName = this.containerName;
        const containerClient = azClient.getContainerClient(containerName);

        const blobName = WinstonAzureBlob.generateBlobName({
            blobName: this.blobName,
            extension: this.extension,
            rotatePeriod: this.rotatePeriod,
        });

        const appendBlobClient = containerClient.getAppendBlobClient(blobName);

        const toSend =
            tasks
                .map((item) => item[MESSAGE as unknown as string])
                .join(this.eol) + this.eol;

        const chunks = this._chunkString(toSend, MAX_APPEND_BLOB_BLOCK_SIZE);

        debug("Numbers of appendblock needed", chunks.length);
        debug("Size of chunks", toSend.length);

        async.eachSeries(
            chunks,
            (chunk, nextAppendBlock) => {
                this._appendBlobOperation(
                    appendBlobClient,
                    chunk,
                    nextAppendBlock
                );
            },
            callback
        );
    }
}

export const winstonAzureBlob = (
    opts: ConstructorParameters<typeof WinstonAzureBlob>[0]
) => new WinstonAzureBlob(opts);
