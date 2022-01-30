import { ILoggerDefaults, winstonAzureBlob } from "../lib";
import { expect } from "chai";
import * as dotenv from "dotenv";
import * as winston from "winston";
import { randAnimalType } from "@ngneat/falso";
import { delay, streamToString } from "./utils";

dotenv.config();

describe("WinstonAzureBlob", () => {
    type _constants = Pick<ILoggerDefaults, "containerName" | "blobName">;

    const constants: _constants = {
        containerName: "sample",
        blobName: "test_log",
    };

    const transport = winstonAzureBlob({
        account: {
            host: process.env.HOST || "host",
            sasToken: process.env.SAS_TOKEN || "sasToken",
        },
        ...constants,
        level: "info",
        bufferLogSize: 1,
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
            level: "info",
            bufferLogSize: 1,
            syncTimeout: 0,
            rotatePeriod: "",
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
            level: "info",
            bufferLogSize: 1,
            syncTimeout: 0,
            rotatePeriod: "",
            ...constants,
        });
        expect(azBlob.containerName).to.equal(constants.containerName);
        expect(azBlob.blobName).to.equal(constants.blobName);
        expect(azBlob.level).to.equal("info");
        expect(azBlob.eol).to.equal("\n");
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
});
