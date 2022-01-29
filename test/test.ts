import { ILoggerDefaults, winstonAzureBlob } from "../lib";
import { expect } from "chai";
import * as dotenv from "dotenv";
import * as winston from "winston";
import faker from "faker";
// import { StorageError } from "azure-storage";

dotenv.config();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const streamToString = (readableStream: NodeJS.ReadableStream) => {
    //@ts-ignore
    return new Promise<string>((resolve, reject) => {
        const chunks: string[] = [];
        if (!readableStream.readable) {
            return reject;
        }
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            return resolve(chunks.join(""));
        });
        readableStream.on("error", () => {
            return reject;
        });
    });
};

describe("WinstonAzureBlob", () => {
    type _constants = Pick<ILoggerDefaults, "containerName" | "blobName">;

    const constants: _constants = {
        containerName: "sample",
        blobName: "test_log",
    };

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
        const contents = faker.lorem.paragraph(3);

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

        const logger = winston.createLogger({
            transports: [transport],
        });

        logger.info(contents);

        await delay(1000);

        const client = transport.azBlobClient;

        const containerClient = client.getContainerClient(
            constants.containerName
        );

        const blobClient = containerClient.getBlobClient(constants.blobName);

        const downloadBlockBlobResponse = await blobClient.download();
        const downloaded = await streamToString(
          //@ts-ignore
            downloadBlockBlobResponse.readableStreamBody
        );

        console.log("Downloaded blob content:", downloaded);

        expect(downloaded).to.equal(
            `{"message":"${contents}","level":"info"}\n`
        );

        // // get blob from azure
        // client.getBlobToText(
        //     constants.containerName,
        //     constants.blobName,
        //     function (error: StorageError, result) {
        //         if (error) {
        //             throw error;
        //         }
        //         expect(result).to.equal(
        //             `{"message":"${contents}","level":"info"}\n`
        //         );

        //         // delete blob from azure
        //         client.deleteBlob(
        //             constants.containerName,
        //             constants.blobName,
        //             function (error, result) {
        //                 if (error) {
        //                     throw error;
        //                 }
        //                 expect(result.isSuccessful).to.equal(true);
        //             }
        //         );
        //     }
        // );
    });
});
