import _ from "lodash";
import { randAnimalType } from "@ngneat/falso";
import * as winston from "winston";
import { winstonAzureBlob } from "../lib";
import * as dotenv from "dotenv";

dotenv.config();

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        winstonAzureBlob({
            account: {
                host: process.env.HOST || "host",
                sasToken: process.env.SAS_TOKEN || "sasToken",
            },
            blobName: "example_logs",
            bufferLogSize: 1,
            containerName: "sample",
            level: "info",
            rotatePeriod: "YYYY-MM-DD",
            syncTimeout: 0,
        }),
    ],
});

// eslint-disable-next-line array-callback-return
_.times(100).map((v) => {
    logger.info(`index ${v} sample log ${randAnimalType()}`);
});
