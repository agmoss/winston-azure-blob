import {
    extensions,
    ILoggerDefaults,
    winstonAzureBlob,
    WinstonAzureBlob,
} from "../lib";
import { expect } from "chai";
import * as dotenv from "dotenv";
import * as winston from "winston";
import { randAnimalType } from "@ngneat/falso";
import { delay, formatYmd, streamToString } from "./utils";

dotenv.config();

/**
 * These tests require all 4 ENV variables (HOST, SAS_TOKEN, ACCOUNT_NAME, and ACCOUNT_KEY)
 */
describe("WinstonAzureBlob", () => {
    type _constants = Pick<ILoggerDefaults, "blobName" | "containerName">;

    const constants: _constants = {
        blobName: "test_log",
        containerName: "sample",
    };

    const transport = winstonAzureBlob({
        account: {
            host: process.env.HOST || "host",
            sasToken: process.env.SAS_TOKEN || "sasToken",
        },
        ...constants,
        bufferLogSize: 1,
        level: "info",
        syncTimeout: 0,
    });

    const client = transport.azBlobClient;

    const containerClient = client.getContainerClient(constants.containerName);

    const blobClient = containerClient.getBlobClient(constants.blobName);

    after(async () => {
        await blobClient.delete();
    });

    it("name and key options", () => {
        const azBlob = winstonAzureBlob({
            account: {
                name: process.env.ACCOUNT_NAME || "account-name",
                key: process.env.ACCOUNT_KEY || "account-key",
            },

            bufferLogSize: 1,
            level: "info",
            rotatePeriod: "",
            syncTimeout: 0,
            ...constants,
        });
        expect(azBlob.containerName).to.equal(constants.containerName);
        expect(azBlob.blobName).to.equal(constants.blobName);
        expect(azBlob.level).to.equal("info");
        expect(azBlob.eol).to.equal("\n");
    });

    it("host and sasToken options", () => {
        const azBlob = winstonAzureBlob({
            account: {
                host: process.env.HOST || "host",
                sasToken: process.env.SAS_TOKEN || "sasToken",
            },
            bufferLogSize: 1,
            level: "info",
            rotatePeriod: "",
            syncTimeout: 0,
            ...constants,
        });
        expect(azBlob.containerName).to.equal(constants.containerName);
        expect(azBlob.blobName).to.equal(constants.blobName);
        expect(azBlob.level).to.equal("info");
        expect(azBlob.eol).to.equal("\n");
    });

    it("has a proper file name with opts", () => {
        const azBlob = winstonAzureBlob({
            account: {
                host: process.env.HOST || "host",
                sasToken: process.env.SAS_TOKEN || "sasToken",
            },
            bufferLogSize: 1,
            extension: extensions.LOG,
            level: "info",
            rotatePeriod: "YYYY-MM-DD",
            syncTimeout: 0,
            ...constants,
        });

        const generatedBlobName = WinstonAzureBlob.generateBlobName({
            blobName: azBlob.blobName,
            extension: azBlob.extension,
            rotatePeriod: azBlob.rotatePeriod,
        });

        expect(generatedBlobName).to.equal(
            constants.blobName + "." + formatYmd(new Date()) + ".log"
        );
    });

    it("sends logs", async () => {
        const contents = randAnimalType();

        const logger = winston.createLogger({
            transports: [transport],
        });

        logger.info(contents);

        await delay(1000);

        const downloadBlockBlobResponse = await blobClient.download();
        const downloaded = await streamToString(
            // @ts-ignore
            downloadBlockBlobResponse.readableStreamBody
        );

        expect(downloaded).to.equal(
            `{"level":"info","message":"${contents}"}\n`
        );
    });

    it("handles incorrect account key/name information", () => {
        expect(() => {
            winstonAzureBlob({
                account: {
                    name: undefined as any,
                    key: undefined as any,
                },

                bufferLogSize: 1,
                level: "info",
                rotatePeriod: "",
                syncTimeout: 0,
                ...constants,
            });
        }).to.throw(
            "Azure account key/name must be string values, received key:undefined, name:undefined"
        );
    });

    it("handles incorrect account host/sasToken information", () => {
        expect(() => {
            winstonAzureBlob({
                account: {
                    host: undefined as any,
                    sasToken: undefined as any,
                },

                bufferLogSize: 1,
                level: "info",
                rotatePeriod: "",
                syncTimeout: 0,
                ...constants,
            });
        }).to.throw(
            "Azure account host/sasToken must be string values, received key:undefined, name:undefined"
        );
    });
});
