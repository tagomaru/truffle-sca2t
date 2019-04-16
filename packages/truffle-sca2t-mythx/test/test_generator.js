const assert = require('assert')
const sinon = require('sinon')
// const rewire = require('rewire')
const Generator = require('../lib/generator').Generator
const Runner = require('../lib/runner').Runner
const fs = require('fs')
const path = require('path')

describe('generator.js', () => {
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

  describe('generate method', () => {
    let getTestTargetsStub
    let mkdirTestSecurityStub
    let generateTestFileStub
    let generateSca2tConfigStub
    let addTestScriptsStub

    beforeEach(() => {
      getTestTargetsStub = sinon.stub(Generator.prototype, 'getTestTargets')
      mkdirTestSecurityStub = sinon.stub(Generator.prototype, 'mkdirTestSecurity')
      generateTestFileStub = sinon.stub(Generator.prototype, 'generateTestFile')
      generateSca2tConfigStub = sinon.stub(Generator.prototype, 'generateSca2tConfig')
      addTestScriptsStub = sinon.stub(Generator.prototype, 'addTestScripts')
    })

    afterEach(() => {
      getTestTargetsStub.restore()
      mkdirTestSecurityStub.restore()
      generateTestFileStub.restore()
      generateSca2tConfigStub.restore()
      addTestScriptsStub.restore()
    })

    it('should call all of necesary methods', async () => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'

      const generator = new Generator(['A.sol'], config)

      const testTargets = { 'A.sol': ['A', 'B'] }
      getTestTargetsStub.resolves(testTargets)

      await generator.generate()

      assert.ok(getTestTargetsStub.called)
      assert.ok(mkdirTestSecurityStub.called)
      assert.ok(generateTestFileStub.calledWith(testTargets))
      assert.ok(generateSca2tConfigStub.called)
      assert.ok(addTestScriptsStub.called)
    })
  })

  describe('getTestTargets method', () => {
    let doCompileStub
    beforeEach(() => {
      doCompileStub = sinon.stub(Runner.prototype, 'doCompile')
    })

    afterEach(() => {
      doCompileStub.restore()
    })

    it('should generate testTargets if one file and two contrancts in the file.', async () => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
      const compiledResult = {
        'compiledOutput': {
          'A': {
            'contract_name': 'A',
            'sourcePath': '/contracts/A.sol'
          },
          'B': {
            'contract_name': 'B',
            'sourcePath': '/contracts/A.sol'
          },
          'C': {
            'contract_name': 'C',
            'sourcePath': '/contracts/C.sol'
          }
        }
      }
      doCompileStub.returns(compiledResult)

      const generator = new Generator(['A.sol'], config)
      const results = await generator.getTestTargets()

      assert.ok(doCompileStub.called)
      assert.deepStrictEqual(results, { 'A.sol': [ 'A', 'B' ] })
    })

    it('should generate testTargets if two files.', async () => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'

      const compiledResultForA = {
        'compiledOutput': {
          'A': {
            'contract_name': 'A',
            'sourcePath': '/contracts/A.sol'
          }
        }
      }

      const compiledResultForB = {
        'compiledOutput': {
          'B': {
            'contract_name': 'B',
            'sourcePath': '/contracts/B.sol'
          }
        }
      }

      doCompileStub.onFirstCall().returns(compiledResultForA)
      doCompileStub.onSecondCall().returns(compiledResultForB)

      const generator = new Generator(['A.sol', 'B.sol'], config)
      const testTargets = await generator.getTestTargets()

      assert.ok(doCompileStub.called)
      assert.deepStrictEqual(testTargets, { 'A.sol': [ 'A' ], 'B.sol': ['B'] })
    })
  })

  describe('mkdirTestSecurity method', () => {
    let mkdirSyncStub
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
      mkdirSyncStub = sinon.stub(fs, 'mkdirSync')
    })

    afterEach(() => {
      mkdirSyncStub.restore()
    })

    it('should not throw error if mkdirSync throws error', async () => {
      mkdirSyncStub.call(path.join(config.working_directory, 'test_security'))

      const generator = new Generator([], config)

      generator.mkdirTestSecurity()

      assert.ok(mkdirSyncStub.calledWith(path.join(config.working_directory, 'test_security')))
    })

    it('should throw error if mkdirSync throws error and the code of error is not EEXIST', async () => {
      mkdirSyncStub.throws('some error')

      const generator = new Generator([], config)

      assert.throws(() => {
        generator.mkdirTestSecurity()
      })
    })

    it('should not throw error if mkdirSync throws error with code EEXIST', async () => {
      const error = new Error('some error')
      error.code = 'EEXIST'
      mkdirSyncStub.throws(error)

      const generator = new Generator([], config)

      assert.doesNotThrow(() => {
        generator.mkdirTestSecurity()
      })
    })
  })

  describe('generateTestFile method', () => {
    let writeFileSyncStub
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'

      writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
    })

    afterEach(() => {
      writeFileSyncStub.restore()
    })

    it('should write test code file if target are two files and the one has two contracts', async () => {
      const testTargets = { 'A.sol': [ 'A', 'B' ], 'C.sol': ['C'] }

      const generator = new Generator([], config)

      generator.generateTestFile(testTargets)

      assert.ok(logStub.calledWith('success'.green + ` - Test code of A in A.sol is generated.`))
      assert.ok(logStub.calledWith('success'.green + ` - Test code of B in A.sol is generated.`))
      assert.ok(logStub.calledWith('success'.green, '- ./test_security/test_' + 'A.sol' + '_.js was generated.'))

      assert.ok(logStub.calledWith('success'.green + ` - Test code of C in C.sol is generated.`))
      assert.ok(logStub.calledWith('success'.green, '- ./test_security/test_' + 'C.sol' + '_.js was generated.'))
    })

    it('should throw err, if renderFile passes err', async () => {
      const renderFileStub = sinon.stub(require('ejs'), 'renderFile')
      renderFileStub.yields(new Error(), null)

      const testTargets = { 'A.sol': [ 'A', 'B' ], 'C.sol': ['C'] }

      const generator = new Generator([], config)

      assert.throws((e) => {
        generator.generateTestFile(testTargets)
      })

      assert.ok(!logStub.calledWith('success'.green + ` - Test code of A in A.sol is generated.`))
      assert.ok(!logStub.calledWith('success'.green + ` - Test code of B in A.sol is generated.`))
      assert.ok(!logStub.calledWith('success'.green, '- ./test_security/test_' + 'A.sol' + '_.js was generated.'))

      assert.ok(!logStub.calledWith('success'.green + ` - Test code of C in C.sol is generated.`))
      assert.ok(!logStub.calledWith('success'.green, '- ./test_security/test_' + 'C.sol' + '_.js was generated.'))

      renderFileStub.restore()
    })
  })

  describe('generateSca2tConfig method', () => {
    let statSyncStub
    let copyFileSyncStub
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      config.contracts_directory = '/contracts'
      statSyncStub = sinon.stub(fs, 'statSync')
      copyFileSyncStub = sinon.stub(fs, 'copyFileSync')
    })

    afterEach(() => {
      statSyncStub.restore()
      copyFileSyncStub.restore()
    })

    it('should not throw error if statSync does not throw error', () => {
      const generator = new Generator([], config)

      generator.generateSca2tConfig()

      assert.ok(statSyncStub.called)
      assert.ok(logStub.calledWith('./sca2t-config.js already exists.'.yellow))
      assert.ok(!copyFileSyncStub.called)
      assert.ok(!logStub.calledWith('success'.green, '- ./sca2t-config.js was generated.'))
    })

    it('should not throw error if statSync throws error with code ENOENT', () => {
      let error = new Error('error')
      error.code = 'ENOENT'
      statSyncStub.throws(error)

      const generator = new Generator([], config)

      generator.generateSca2tConfig()

      assert.ok(statSyncStub.called)
      assert.ok(!logStub.calledWith('./sca2t-config.js already exists.'.yellow))
      assert.ok(copyFileSyncStub.called)
      assert.ok(logStub.calledWith('success'.green, '- ./sca2t-config.js was generated.'))
    })

    it('should throw error if statSync throws error without code ENOENT', () => {
      let error = new Error('error')
      error.code = 'CODE'
      statSyncStub.throws(error)

      const generator = new Generator([], config)

      assert.throws(() => {
        generator.generateSca2tConfig()
      })

      assert.ok(statSyncStub.called)
      assert.ok(!logStub.calledWith('./sca2t-config.js already exists.'.yellow))
      assert.ok(!copyFileSyncStub.called)
      assert.ok(!logStub.calledWith('success'.green, '- ./sca2t-config.js was generated.'))
    })
  })

  describe('addTestScripts method', () => {
    let writeFileSyncStub
    beforeEach(() => {
      config.working_directory = '/'
      config.contracts_build_directory = '/build/contracts'
      writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
    })

    afterEach(() => {
      writeFileSyncStub.restore()
      config.working_directory = '/'
    })

    it('should add scripts if scritps does not exist', () => {
      config.working_directory = path.join(__dirname, 'data/generator/noscripts')

      const generator = new Generator([], config)
      generator.addTestScripts()

      assert.ok(!logStub.calledWith('"test:security" script already exists in package.json'.yellow))
      assert.ok(!logStub.calledWith('"test:security:html" script already exists in package.json'.yellow))
      assert.ok(logStub.calledWith('success'.green, '- scripts object was added to package.json'))
      assert.ok(logStub.calledWith('success'.green, '- "test:security" script was added to package.json'))
      assert.ok(logStub.calledWith('success'.green, '- "test:security:html" script was added to package.json'))
      assert.ok(writeFileSyncStub.called)
    })

    it('should nod add scripts if scritps exists', () => {
      config.working_directory = path.join(__dirname, 'data/generator/scriptsexists')

      const generator = new Generator([], config)
      generator.addTestScripts()

      assert.ok(logStub.calledWith('"test:security" script already exists in package.json'.yellow))
      assert.ok(logStub.calledWith('"test:security:html" script already exists in package.json'.yellow))
      assert.ok(!logStub.calledWith('success'.green, '- scripts object was added to package.json'))
      assert.ok(!logStub.calledWith('success'.green, '- "test:security" script was added to package.json'))
      assert.ok(!logStub.calledWith('success'.green, '- "test:security:html" script was added to package.json'))
      assert.ok(!writeFileSyncStub.called)
    })
  })
})
