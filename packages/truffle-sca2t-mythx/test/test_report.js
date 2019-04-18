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
