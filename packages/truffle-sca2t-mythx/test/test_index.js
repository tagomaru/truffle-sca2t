const assert = require('assert')
const sinon = require('sinon')
const rewire = require('rewire')
const Generator = require('../lib/generator').Generator

describe('index.js', () => {
  const index = require('../index')
  let rewiredIndex = rewire('../index')
  let logStub
  let errorStub
  let config

  beforeEach(() => {
    logStub = sinon.stub()
    errorStub = sinon.stub()

    config = {
      logger: {
        log: logStub,
        error: errorStub
      },
      _: [
        'mythx'
      ]
    }
  })

  afterEach(() => {
  })

  it('should show help if help options is set', async () => {
    const stubPrintHelpMessage = sinon.stub()
    rewiredIndex.__set__({
      'printHelpMessage': stubPrintHelpMessage
    })
    config.help = true
    await rewiredIndex(config)
    assert.ok(stubPrintHelpMessage.called)
  })

  it('should stop if set no file', async () => {
    await index(config)
    assert.ok(errorStub.calledWith('please set solidity file'.red))
  })

  it('should finish normally, if set file', async () => {
    const targetFiles = ['a.sol']
    config._.push(targetFiles[0])
    config.working_directory = './'
    config.contracts_build_directory = './contracts'
    const generatorStub = sinon.stub(Generator.prototype, 'generate')

    await index(config)

    assert.ok(generatorStub.called)
    assert.ok(logStub.calledWith('if you want html test report,', '"npm run test:security:html"'.cyan))
  })
})
