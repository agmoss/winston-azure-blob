import { AzureBlob as AzureBlobTransport } from '../lib/winston3-azureblob'
import { expect } from 'chai'
import * as dotenv from 'dotenv'
dotenv.config()

describe('AzureBlobTransport', () => {
  it('options', () => {
    const azBlob = new (AzureBlobTransport)({
      account: {
        name: process.env.ACCOUNT_NAME || 'account-name',
        key: process.env.ACCOUNT_KEY || 'account-key'
      },
      containerName: 'sample',
      blobName: 'logs',
      level: 'info',
      bufferLogSize: 1,
      syncTimeout: 0,
      rotatePeriod: '',
      eol: '\n'
    })
    expect(azBlob.containerName).to.equal('sample')
    expect(azBlob.blobName).to.equal('logs')
    expect(azBlob.level).to.equal('info')
  })
})
