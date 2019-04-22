const assert = require('assert')
const Analysis = require('../lib/get-analysis').Analysis
const sinon = require('sinon')
const Client = require('armlet').Client
const path = require('path')

describe('get-analysis.js', () => {
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

    it('shoud set revolver if it is not set', () => {
      assert.strictEqual(config.resolver, undefined)
      const analysis = new Analysis(config)
      assert.deepStrictEqual(config, analysis.config)
      assert(analysis.config.resolver)
    })
  })

  describe('getAnalysis method', () => {
    let getIssuesStub
    let getStatusStub
    beforeEach(() => {
      config.working_directory = path.resolve(__dirname, 'data/report/projects/issues')
      config.contracts_build_directory = path.resolve(__dirname, 'data/report/projects/issues/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/report/projects/issues/contracts')
      config.uuid = '0000'

      getStatusStub = sinon.stub(Client.prototype, 'getStatus')
      getIssuesStub = sinon.stub(Client.prototype, 'getIssues')
    })

    afterEach(() => {
      getStatusStub.restore()
      getIssuesStub.restore()
    })

    it('should show Vulnerabiliti Report if vlunerablity is found', async () => {
      const statusResult = {
        status: 'Finished'
      }

      const issuesResult = [
        {
          issues: [
            {
              'swcID': 'SWC-101',
              'swcTitle': 'Integer Overflow and Underflow',
              'description': {
                'head': 'The binary addition can overflow.',
                'tail': 'The operands of the addition operation are not sufficiently constrained. The addition could therefore result in an integer overflow. Prevent the overflow by checking inputs or ensure sure that the overflow is caught by an assertion.'
              },
              'severity': 'High',
              'locations': [
                {
                  'sourceMap': '94:5:1'
                }
              ],
              'extra': {
                'testCase': {
                  'initialState': {
                    'accounts': null
                  },
                  'steps': null
                }
              }
            },
            {
              'swcID': 'SWC-103',
              'swcTitle': 'Floating Pragma',
              'description': {
                'head': 'A floating pragma is set.',
                'tail': 'It is recommended to make a conscious choice on what version of Solidity is used for compilation. Currently any version equal or greater than "0.5.0" is allowed.'
              },
              'severity': 'Medium',
              'locations': [
                {
                  'sourceMap': '0:23:0'
                }
              ],
              'extra': {
                'testCase': {
                  'initialState': {
                    'accounts': null
                  },
                  'steps': null
                }
              }
            }
          ],
          sourceList: [
            path.resolve(__dirname, 'data/report/projects/issues/contracts/A.sol'),
            path.resolve(__dirname, 'data/report/projects/issues/contracts/C.sol')
          ]
        }
      ]

      getStatusStub.returns(statusResult)
      getIssuesStub.returns(issuesResult)

      const analysis = new Analysis(config)
      await analysis.getAnalysis()

      assert.ok(logStub.calledWith(`${'=========== Vulnerability Report ================'.yellow}`))
      assert.ok(logStub.calledWith(`${'2 vulnerabilities were found.'.red}`))
    })

    it('should show MythX Logs if MythX Logs is found', async () => {
      const statusResult = {
        status: 'Finished'
      }

      const issuesResult = [
        {
          issues: [],
          sourceList: [],
          meta: {
            logs: [
              {
                level: 'error',
                msg: 'Maru:Error: Unable to detect main source to compile'
              },
              {
                level: 'error',
                msg: 'Maru:Error: Errors returned by the Solidity compiler. Check your code for syntax errors and that you have submitted all imports.'
              }
            ]
          }
        }
      ]

      getStatusStub.returns(statusResult)
      getIssuesStub.returns(issuesResult)

      const analysis = new Analysis(config)
      await analysis.getAnalysis()

      assert.ok(logStub.calledWith(`${'=========== MythX Logs ================'.yellow}`))
      assert.ok(logStub.calledWith(`${JSON.stringify(issuesResult[0].meta.logs, null, 2)}`))
    })

    it('should stop if status is not Finished', async () => {
      const statusResult = {
        status: 'Not Finished'
      }

      getStatusStub.returns(statusResult)

      const analysis = new Analysis(config)
      await analysis.getAnalysis()

      assert.ok(errorStub.calledWith(`The job status is still '${statusResult.status}'.`.red))
    })

    it('should throw Error if getStatus throws Error', async () => {
      getStatusStub.throws(new Error('some error'))

      const analysis = new Analysis(config)
      await analysis.getAnalysis().catch(e => {
        assert.strictEqual(e.message, 'some error')
      })
    })

    it('should throw Error if getIssues throws Error', async () => {
      const statusResult = {
        status: 'Finished'
      }
      getStatusStub.returns(statusResult)
      getIssuesStub.throws(new Error('some error'))

      const analysis = new Analysis(config)
      await analysis.getAnalysis().catch(e => {
        assert.strictEqual(e.message, 'some error')
      })
    })

    it('should throw Error if Resolver.resolve rejects', async () => {
      const statusResult = {
        status: 'Finished'
      }

      const issuesResult = [
        {
          issues: [
            {
              'swcID': 'SWC-101',
              'swcTitle': 'Integer Overflow and Underflow',
              'description': {
                'head': 'The binary addition can overflow.',
                'tail': 'The operands of the addition operation are not sufficiently constrained. The addition could therefore result in an integer overflow. Prevent the overflow by checking inputs or ensure sure that the overflow is caught by an assertion.'
              },
              'severity': 'High',
              'locations': [
                {
                  'sourceMap': '94:5:1'
                }
              ],
              'extra': {
                'testCase': {
                  'initialState': {
                    'accounts': null
                  },
                  'steps': null
                }
              }
            },
            {
              'swcID': 'SWC-103',
              'swcTitle': 'Floating Pragma',
              'description': {
                'head': 'A floating pragma is set.',
                'tail': 'It is recommended to make a conscious choice on what version of Solidity is used for compilation. Currently any version equal or greater than "0.5.0" is allowed.'
              },
              'severity': 'Medium',
              'locations': [
                {
                  'sourceMap': '0:23:0'
                }
              ],
              'extra': {
                'testCase': {
                  'initialState': {
                    'accounts': null
                  },
                  'steps': null
                }
              }
            }
          ],
          sourceList: [
            path.resolve(__dirname, 'data/report/NOPROJECT/issues/contracts/A.sol'),
            path.resolve(__dirname, 'data/report/NOPROJECT/issues/contracts/C.sol')
          ]
        }
      ]

      getStatusStub.returns(statusResult)
      getIssuesStub.returns(issuesResult)

      config.working_directory = path.resolve(__dirname, 'data/report/NOPROJECT/issues')
      config.contracts_build_directory = path.resolve(__dirname, 'data/report/NOPROJECT/issues/build/contracts')
      config.contracts_directory = path.resolve(__dirname, 'data/report/NOPROJECT/issues/contracts')
      const analysis = new Analysis(config)
      await analysis.getAnalysis().catch(e => {
        assert.ok(e.message.startsWith('Could not find'))
      })
      assert.ok(!logStub.calledWith(`${'=========== Vulnerability Report ================'.yellow}`))
    })
  })
})
