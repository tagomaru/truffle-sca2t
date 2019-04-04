const assert = require('assert')
const sinon = require('sinon')

describe('index.js', () => {
  const index = require('../index')
  let errorStub
  let config

  beforeEach(() => {
    errorStub = sinon.stub()

    config = {
      logger: {
        error: errorStub
      },
      _: [
        'dependencies'
      ]
    }
  })

  afterEach(() => {
  })

  it('should stop if set no file', async () => {
    await index(config)
    assert.ok(errorStub.calledWith('please set solidity file'.red))
  })
})
