const assert = require('assert')
const sinon = require('sinon')
const Report = require('../lib/report').Report

describe('report.js', () => {
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
    it('should set config if config is passed', () => {
      const report = new Report([], config)
      assert.deepStrictEqual(config, report.config)
    })
  })

  describe('getMythXLogs method', () => {
    it('should return logs', () => {
      const report = new Report([], config)
      const issues = {
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
        },
        selectedCompiler: 'Unknown'
      }
      const logs = report.getMythXLogs(issues)
      assert.deepStrictEqual(logs, issues.meta.logs)
      assert.strictEqual(logs.length, 2)
    })
  })

  describe('getJsonIssues method', () => {
    it('should return issues', () => {
      const data = {
        sourceList: [
          '/issues/contracts/A.sol',
          '/issues/contracts/C.sol'
        ],
        sources: {
          '/issues/contracts/A.sol': {
            source: 'pragma solidity ^0.5.0;\\nimport "./C.sol";\\ncontract A is C {}\\ncontract B {}'
          },
          '/issues/contracts/C.sol': {
            source: 'pragma solidity ^0.5.0;\ncontract C {\n  uint public a;\n  function add(uint b) public {\n    a = a + b;\n  }\n}\n'
          }
        }
      }

      const issues = {
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
          '/issues/contracts/A.sol',
          '/issues/contracts/C.sol'
        ]
      }
      const report = new Report(data, config)
      const results = report.getJsonIssues(issues)

      assert.strictEqual(results.length, 2)
      assert.strictEqual(results[0].swcID, 'SWC-101')
      assert.strictEqual(results[0].locations[0].file, '/issues/contracts/C.sol')
      assert.strictEqual(results[0].locations[0]['source (94:99)'], 'a + b')
    })
  })

  describe('getReport method', () => {
    it('should return report', () => {
      const jsonIssues = [
        {
          swcID: 'SWC-101',
          swcTitle: 'Integer Overflow and Underflow',
          description: {
            head: 'The binary addition can overflow.',
            tail: 'The operands of the addition operation are not sufficiently constrained. The addition could therefore result in an integer overflow. Prevent the overflow by checking inputs or ensure sure that the overflow is caught by an assertion.'
          },
          severity: 'High',
          locations: [
            {
              file: '/issues/contracts/C.sol',
              'source (94:99)': 'a + b'
            }
          ]
        },
        {
          swcID: 'SWC-103',
          swcTitle: 'Floating Pragma',
          description: {
            head: 'A floating pragma is set.',
            tail: 'It is recommended to make a conscious choice on what version of Solidity is used for compilation. Currently any version equal or greater than \"0.5.0\" is allowed.' // eslint-disable-line
          },
          severity: 'Medium',
          locations: [
            {
              file: '/issues/contracts/A.sol',
              'source (0:23)': 'pragma solidity ^0.5.0;'
            }
          ]
        }
      ]
      const report = new Report({}, config)
      const results = report.getReport(jsonIssues)
      const resultsJson = JSON.parse(results)

      assert.strictEqual(resultsJson.length, 2)
      assert.strictEqual(resultsJson[0].Title, 'The binary addition can overflow. (High)')
      assert.strictEqual(resultsJson[0].Detail.description, 'The operands of the addition operation are not sufficiently constrained. The addition could therefore result in an integer overflow. Prevent the overflow by checking inputs or ensure sure that the overflow is caught by an assertion.')
      assert.strictEqual(resultsJson[0].Detail.description.head, undefined)
      assert.strictEqual(resultsJson[0].Detail.description.tail, undefined)
    })
  })

  describe('convertErrToStr method', () => {
    it('should return str if err is str', () => {
      const report = new Report([], config)
      const result = report.convertErrToStr('some error')
      assert.ok(typeof result === 'string')
      assert.strictEqual(result, 'some error')
    })

    it('should return str if err is Error object', () => {
      const report = new Report([], config)
      const result = report.convertErrToStr(new Error('some error'))
      assert.ok(typeof result === 'string')
      assert.strictEqual(result, 'some error')
    })
  })
})
