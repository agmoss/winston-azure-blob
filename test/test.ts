import { winstonAzureBlob } from '../lib/winston-azure-blob'
import { expect } from 'chai'
import * as dotenv from 'dotenv'
dotenv.config()

describe('WinstonAzureBlob', () => {
  it('options', () => {
    const azBlob = winstonAzureBlob({
      account: {
        name: process.env.ACCOUNT_NAME || 'account-name',
        key: process.env.ACCOUNT_KEY || 'account-key'
      },
      containerName: 'sample',
      blobName: 'logs',
      level: 'info',
      bufferLogSize: 1,
      syncTimeout: 0,
      rotatePeriod: ''
    })
    expect(azBlob.containerName).to.equal('sample')
    expect(azBlob.blobName).to.equal('logs')
    expect(azBlob.level).to.equal('info')
    expect(azBlob.eol).to.equal('\n')
  })
})
