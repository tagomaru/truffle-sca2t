const fs = require('fs')
const path = require('path')
const Runner = require('./runner').Runner
const ejs = require('ejs')
const Config = require('truffle-config')
const Resolver = require('truffle-resolver')

const Generator = class {
  constructor (targetFiles, config) {
    if (config) {
      this.config = config
    } else {
      this.config = Config.detect()
    }

    if (!config.resolver) {
      config.resolver = new Resolver(config)
    }

    this.targetFiles = targetFiles
  }

  async generate () {
    // get test targets
    const testTargets = await this.getTestTargets()

    // mkdir test_security
    this.mkdirTestSecurity()

    // Generate Test Code files
    this.generateTestFile(testTargets)

    // Generate sca2t-config.js file
    this.generateSca2tConfig()

    // add scripts to package.json file
    this.addTestScripts()
  }

  async getTestTargets () {
    const testTargets = {}

    // get test target for each file
    for (let i = 0; i < this.targetFiles.length; i++) {
      const targetFile = this.targetFiles[i]
      const runner = new Runner(targetFile, this.config)

      // compile
      const results = await runner.doCompile()

      // filter by sourcePath
      // since doCompile returns compiled result for not only target file but also all of dependencies files
      const contracts = []
      Object.keys(results.compiledOutput).forEach(contract => {
        if (results.compiledOutput[contract].sourcePath === path.join(this.config.contracts_directory, targetFile)) {
          contracts.push(contract)
        }
      })

      // like { 'A.sol': [ 'A', 'B' ], 'C.sol': [ 'C' ] }
      testTargets[targetFile] = contracts
    }

    return testTargets
  }

  mkdirTestSecurity () {
    // if test_security does not exit, make the directory
    try {
      fs.mkdirSync(path.join(this.config.working_directory, 'test_security'))
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e
      }
    }
  }

  generateTestFile (testTargets) {
    for (let i = 0; i < Object.keys(testTargets).length; i++) {
      // main template file of test code file
      const ejbMainFile = path.join(__dirname, 'templates/main.js')

      // template file of test code file for each contract
      const ejbContractFile = path.join(__dirname, 'templates/contract.js')

      // solidity file name
      const solFileName = Object.keys(testTargets)[i]

      const contractTemplates = []

      // generate test code of each contract and push them into contractTemplates arr
      testTargets[solFileName].forEach(contractName => {
        ejs.renderFile(ejbContractFile, { contractName }, (err, template) => {
          if (err) throw err
          contractTemplates.push(template)
          this.config.logger.log('success'.green + ` - Test code of ${contractName} in ${solFileName} is generated.`)
        })
      })

      // generate test code file and insert templates of contracts into it.
      ejs.renderFile(ejbMainFile, { solFileName, contractTemplates }, (err, template) => {
        if (err) throw err
        // generate test code file
        fs.writeFileSync(path.join(this.config.working_directory, 'test_security/test_' + solFileName + '_.js'), template)
        this.config.logger.log('success'.green, '- ./test_security/test_' + solFileName + '_.js was generated.')
      })
    }
  }

  generateSca2tConfig () {
    const srcPath = path.join(__dirname, 'templates/sca2t-config.js')
    const destPath = path.join(this.config.working_directory, 'sca2t-config.js')

    try {
      // check existing. if it does not exist, statSync throws err.
      // if exists, do nothing
      fs.statSync(destPath)
      this.config.logger.log('./sca2t-config.js already exists.'.yellow)
    } catch (err) {
      // if not exist, move template to destination.
      if (err.code === 'ENOENT') {
        fs.copyFileSync(srcPath, destPath)
        this.config.logger.log('success'.green, '- ./sca2t-config.js was generated.')
      } else {
        // unexpected err
        throw err
      }
    }
  }

  addTestScripts () {
    const packageJsonPath = path.join(this.config.working_directory, 'package.json')
    const packageJson = require(packageJsonPath)

    // if scripts is not defined, add it
    let scriptsUpdated = false
    if (!packageJson.scripts) {
      packageJson.scripts = {}
      scriptsUpdated = true
    }

    // if security is not defined, add it
    let securityUpdated = false
    if (!packageJson.scripts['test:security']) {
      packageJson.scripts['test:security'] = 'mocha ./test_security --timeout 500000'
      securityUpdated = true
    } else {
      this.config.logger.log('"test:security" script already exists in package.json'.yellow)
    }

    // if security-html is not defined, add it
    let securityHtmlUpdated = false
    if (!packageJson.scripts['test:security:html']) {
      packageJson.scripts['test:security:html'] = 'mocha ./test_security --timeout 500000 --reporter mocha-simple-html-reporter --reporter-options output=security-report.html'
      securityHtmlUpdated = true
    } else {
      this.config.logger.log('"test:security:html" script already exists in package.json'.yellow)
    }

    if (scriptsUpdated || securityUpdated || securityHtmlUpdated) {
      // update package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), { encoding: 'utf-8' })

      if (scriptsUpdated) {
        this.config.logger.log('success'.green, '- scripts object was added to package.json')
      }

      if (securityUpdated) {
        this.config.logger.log('success'.green, '- "test:security" script was added to package.json')
      }

      if (securityHtmlUpdated) {
        this.config.logger.log('success'.green, '- "test:security:html" script was added to package.json')
      }
    }
  }
}

module.exports = {
  Generator
}
