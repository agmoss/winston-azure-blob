import _ from 'lodash'
import faker from 'faker'
import * as winston from 'winston'
import { winstonAzureBlob } from '../lib'
import * as dotenv from 'dotenv'

dotenv.config()

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    winstonAzureBlob({
      account: {
        host: process.env.HOST || 'host',
        sasToken: process.env.SAS_TOKEN || 'sasToken'
      },
      containerName: 'sample',
      blobName: 'logs7',
      level: 'info',
      bufferLogSize: 1,
      syncTimeout: 0
    })
  ]
})

// eslint-disable-next-line array-callback-return
_.times(100).map(v => {
  logger.info(`index ${v} sample log ${faker.lorem.paragraph(3)}`)
})
