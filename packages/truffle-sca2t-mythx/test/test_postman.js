const assert = require('assert')
const Postman = require('../lib/postman').Postman
const Runner = require('../lib/runner').Runner
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

describe('postman.js', () => {
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

  describe('constructor', () => {
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
    })

    it('should set config and targetFiles', () => {
      const targetFiles = ['A.sol', 'B.sol']
      const postman = new Postman(config, targetFiles)
      assert.deepStrictEqual(config, postman.config)
      assert.deepStrictEqual(targetFiles, postman.targetFiles)
    })
  })

  describe('generateCollectionFile method', () => {
    let writeFileSyncStub
    let generateDataForAPIStub
    beforeEach(() => {
      writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
      generateDataForAPIStub = sinon.stub(Runner.prototype, 'generateDataForAPI')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      config.working_directory = path.resolve(__dirname, 'data/postman/projects/normal')
      config.contracts_build_directory = path.resolve(__dirname, 'data/postman/projects/normal/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/postman/projects/normal/contracts')
    })

    afterEach(() => {
      writeFileSyncStub.restore()
      generateDataForAPIStub.restore()
    })

    it('should generate postman file', async () => {
      generateDataForAPIStub.restore()
      const targetFiles = ['A.sol', 'C.sol']
      const postman = new Postman(config, targetFiles)
      await postman.generateCollectionFile()

      assert.ok(writeFileSyncStub.called)
    })

    it('should throw Error if generateSubmitReq throws Error', async () => {
      generateDataForAPIStub.returns([])
      const targetFiles = ['A.sol']
      const postman = new Postman(config, targetFiles)
      try {
        await postman.generateCollectionFile()
      } catch (err) {
        assert.strictEqual(err.message, 'could not find target data.')
      }
    })
  })
})
