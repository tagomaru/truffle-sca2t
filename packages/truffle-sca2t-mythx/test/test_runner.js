const sinon = require('sinon')
const Runner = require('../lib/runner').Runner
const assert = require('assert')
const path = require('path')
const Config = require('truffle-config')
const Client = require('armlet').Client

describe('runner.js', () => {
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

    afterEach(() => {
    })

    it('should throw error if contractFile is not defined', async () => {
      assert.throws(() => {
        new Runner(undefined, config) // eslint-disable-line
      })
    })

    it('should not throw error and return file path if contractFile is defined', async () => {
      let runner
      assert.doesNotThrow(() => {
        runner = new Runner('A.sol', config)
      })
      assert.strictEqual(runner.targetFile, path.join(config.contracts_directory, 'A.sol'))
    })

    it('should set config if it does not pass config to constructor', async () => {
      const detectStub = sinon.stub(Config, 'detect')
      assert.throws(() => {
        new Runner('A.sol', undefined) // eslint-disable-line
      })
      assert.ok(detectStub.called)
    })

    it('should set resolver if config does not have resolver', async () => {
      assert.ok(config.resolver === undefined)
      const runner = new Runner('A.sol', config)
      assert.ok(runner.config.resolver !== undefined)
    })
  })

  describe('doCompile method', () => {
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
    })

    afterEach(() => {
    })

    it('should be compiled if the file has two contracts', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.join(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.join(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      const runner = new Runner('A.sol', config)
      const results = await runner.doCompile()
      const compiledOutput = results.compiledOutput
      assert.strictEqual(Object.keys(compiledOutput).length, 2)
      assert.strictEqual(compiledOutput.A.contract_name, 'A')
      assert.notStrictEqual(compiledOutput.A.bytecode, '0x')
      assert.strictEqual(compiledOutput.B.contract_name, 'B')
      assert.notStrictEqual(compiledOutput.B.bytecode, '0x')
    })

    it('should skip file with bytecode 0x', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.join(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.join(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      const runner = new Runner('C.sol', config)
      const results = await runner.doCompile()
      const compiledOutput = results.compiledOutput
      assert.ok(logStub.calledWith(`bytecode of 'C' is '0x'. skipping...`.red))
      assert.ok(!logStub.calledWith(`bytecode of 'D' is '0x'. skipping...`.red))
      assert.strictEqual(Object.keys(compiledOutput).length, 1)
      assert.strictEqual(compiledOutput.C, undefined)
      assert.strictEqual(compiledOutput.D.contract_name, 'D')
    })

    it('should be compiled if contract has base contract', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.join(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.join(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      const runner = new Runner('Child.sol', config)
      const results = await runner.doCompile()
      const compiledOutput = results.compiledOutput
      assert.strictEqual(Object.keys(compiledOutput).length, 2)
      assert.strictEqual(compiledOutput.Child.contract_name, 'Child')
      assert.strictEqual(compiledOutput.Parent.contract_name, 'Parent')
    })
  })

  describe('generateDataForAPI method', () => {
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
    })

    afterEach(() => {
    })

    it('should generate data if the file has two contracts', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.join(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.join(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      const runner = new Runner('A.sol', config)
      const results = await runner.doCompile()

      const dataArr = await runner.generateDataForAPI(results)
      assert.strictEqual(dataArr[0].contractName, 'A')
      assert.strictEqual(dataArr[1].contractName, 'B')
    })

    it('should not generate data for dependencies', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.join(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.join(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }
      const runner = new Runner('Child.sol', config)
      const results = await runner.doCompile()

      const dataArr = await runner.generateDataForAPI(results)
      assert.strictEqual(dataArr.length, 1)
      assert.strictEqual(dataArr[0].contractName, 'Child')
    })
  })

  describe('doAnalyzes method', () => {
    let loginStub
    let analyzeWithStatusStub
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'

      loginStub = sinon.stub(Client.prototype, 'login')
      analyzeWithStatusStub = sinon.stub(Client.prototype, 'analyzeWithStatus')
    })

    afterEach(() => {
      loginStub.restore()
      analyzeWithStatusStub.restore()
    })

    it('should return results for each contracts', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.resolve(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }

      analyzeWithStatusStub.onFirstCall().returns({
        status: {
          status: undefined
        },
        issues: [
          {
            'issues': [
              {
                'swcID': 'SWC-103'
              },
              {
                'swcID': 'SWC-104'
              }
            ]
          }
        ]
      })

      analyzeWithStatusStub.onSecondCall().returns({
        status: {
          status: undefined
        },
        issues: [
          {
            'issues': [
              {
                'swcID': 'SWC-103'
              },
              {
                'swcID': 'SWC-104'
              },
              {
                'swcID': 'SWC-105'
              }
            ]
          }
        ]
      })

      const runner = new Runner('A.sol', config)
      const results = await runner.doCompile()
      const dataArr = await runner.generateDataForAPI(results)
      await runner.login()
      assert.ok(loginStub.called)
      const analyzedResults = await runner.doAnalyzes(dataArr)
      assert.ok(analyzeWithStatusStub.called)
      assert.strictEqual(analyzedResults[0].issues[0].issues.length, 2)
      assert.strictEqual(analyzedResults[1].issues[0].issues.length, 3)
    })

    it('should return status with error if status is Error', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.resolve(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }

      analyzeWithStatusStub.onFirstCall().returns({
        status: {
          status: 'Error'
        }
      })

      analyzeWithStatusStub.onSecondCall().returns({
        status: {
          status: 'Not Error'
        }
      })

      const runner = new Runner('A.sol', config)
      const results = await runner.doCompile()
      const dataArr = await runner.generateDataForAPI(results)
      await runner.login()
      assert.ok(loginStub.called)
      const analyzedResults = await runner.doAnalyzes(dataArr)
      assert.ok(analyzeWithStatusStub.called)
      assert.deepStrictEqual(analyzedResults[0].error, { status: 'Error' })
      assert.strictEqual(analyzedResults[1].error, undefined)
    })

    it('should return status with error if analyzeWithStatus throws Error', async () => {
      config.working_directory = path.resolve(__dirname, 'data/runner/projects/normal')
      config.contracts_build_directory = path.resolve(__dirname, 'data/runner/projects/normal/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/runner/projects/normal/contracts')
      config.compilers = {
        solc: {
          version: '0.5.2',
          settings: {
            evmVersion: 'byzantium'
          }
        }
      }

      analyzeWithStatusStub.onFirstCall().throws(new Error('Error Object'))
      analyzeWithStatusStub.onSecondCall().throws('error string', 'Error String')

      const runner = new Runner('A.sol', config)
      const results = await runner.doCompile()
      const dataArr = await runner.generateDataForAPI(results)
      await runner.login()
      assert.ok(loginStub.called)
      const analyzedResults = await runner.doAnalyzes(dataArr)
      assert.ok(analyzeWithStatusStub.called)
      assert.strictEqual(analyzedResults[0].error, 'Error Object')
      assert.strictEqual(analyzedResults[1].error, 'Error String')
    })
  })
})
