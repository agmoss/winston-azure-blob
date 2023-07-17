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
import type { LogEntry } from "winston";

const debug = Debug("winston-azure-blob");
const MAX_APPEND_BLOB_BLOCK_SIZE = 4 * 1024 * 1024;

/**
 * Azure storage account credential variants
 */
type Account =
    | { name: string; key: string }
    | { host: string; sasToken: string }
    | { connectionString: string };

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
    buffer: Array<LogEntry>;
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
    account!: Account;
    azBlobClient: BlobServiceClient;
    blobName: string;
    buffer: Array<LogEntry>;
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

        WinstonAzureBlob.isValidAccountOpts(options.account);

        this.azBlobClient = WinstonAzureBlob.createAzBlobClient(
            options.account
        );
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

    static tackOnRotatePeriodToBlobName({
        blobName,
        rotatePeriod,
    }: Pick<IWinstonAzureBlob, "blobName" | "rotatePeriod">) {
        if (rotatePeriod) {
            return blobName + "." + moment().format(rotatePeriod);
        }
        return blobName;
    }

    static tackOnExtensionToBlobName({
        blobName,
        extension,
    }: Pick<IWinstonAzureBlob, "blobName" | "extension">) {
        if (extension) {
            return blobName + extension;
        }
        return blobName;
    }

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

    static createAzBlobClient(account_info: Account) {
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

        if ("connectionString" in account_info) {
            return BlobServiceClient.fromConnectionString(
                account_info.connectionString
            );
        }

        return new BlobServiceClient(
            `${account_info.host}${account_info.sasToken}`
        );
    }

    private static chunkString(str: string, len: number) {
        const size = Math.ceil(str.length / len);
        const r = Array<string>(size);
        let offset = 0;
        for (let i = 0; i < size; i++) {
            r[i] = str.substring(offset, len);
            offset += len;
        }
        return r;
    }

    private static isValidAccountOpts(account_info: Account) {
        if ("key" in account_info) {
            if (
                typeof account_info.key !== "string" ||
                typeof account_info.name !== "string"
            ) {
                throw new Error(
                    `Azure account key/name must be string values, received key:${typeof account_info.key}, name:${typeof account_info.name} `
                );
            }
            return;
        }

        if ("connectionString" in account_info) {
            if (typeof account_info.connectionString !== "string") {
                throw new Error(
                    `Azure account connectionString must be a string value, received connectionString:${typeof account_info.connectionString} `
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

    private static async appendBlobOperation(
        appendBlobClient: AppendBlobClient,
        chunk: string,
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

    log(info: LogEntry, next: () => void) {
        this.push(info, () => {
            this.emit("logged", info);
            next();
        });
    }

    private push(data: LogEntry, next: () => void) {
        if (data) {
            this.buffer.push(data);
        }
        if (
            this.bufferLogSize < 1 ||
            this.buffer.length >= this.bufferLogSize
        ) {
            this.logToAppendBlob(this.buffer, next); // in this case winston buffer for us
            this.buffer = [];
        } else if (this.syncTimeout && this.timeoutFn === null) {
            this.timeoutFn = setTimeout(() => {
                const tasks = this.buffer.slice(0);
                this.buffer = [];
                this.timeoutFn = null; // as we can receive push again after timeout we must relaunch the timeout
                this.logToAppendBlob(tasks, () => {
                    debug("Finish to appendblock", tasks.length);
                });
            }, this.syncTimeout);
            next();
        } else {
            // buffering
            next();
        }
    }

    private logToAppendBlob(tasks: Array<LogEntry>, next: () => void) {
        debug("Try to appendblock", tasks.length);
        // nothing to log
        if (tasks.length === 0) {
            return next();
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
                // Symbol cannot be used as an index type. Therefore, a cast is required.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item) => item[MESSAGE as unknown as string])
                .join(this.eol) + this.eol;

        const chunks = WinstonAzureBlob.chunkString(
            toSend,
            MAX_APPEND_BLOB_BLOCK_SIZE
        );

        debug("Numbers of appendblock needed", chunks.length);
        debug("Size of chunks", toSend.length);

        async.eachSeries(
            chunks,
            (chunk, nextAppendBlock) => {
                WinstonAzureBlob.appendBlobOperation(
                    appendBlobClient,
                    chunk,
                    nextAppendBlock
                );
            },
            next
        );
    }
}

export const winstonAzureBlob = (
    opts: ConstructorParameters<typeof WinstonAzureBlob>[0]
) => new WinstonAzureBlob(opts);
