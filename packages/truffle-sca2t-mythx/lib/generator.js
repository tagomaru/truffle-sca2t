const fs = require('fs')
const path = require('path')
const Runner = require('./runner').Runner
const ejs = require('ejs')

const Generator = class {
  constructor (targetFiles, config) {
    this.targetFiles = targetFiles
    this.config = config
  }

  async generate () {
    const testTargets = {}
    for (let i = 0; i < this.targetFiles.length; i++) {
      const targetFile = this.targetFiles[i]
      const runner = new Runner(targetFile, this.config)
      const results = await runner.doCompile()

      // filter by sourcePath
      const contracts = []
      Object.keys(results.compiledOutput).forEach(contract => {
        if (results.compiledOutput[contract].sourcePath === path.join(this.config.contracts_directory, targetFile)) {
          contracts.push(contract)
        }
      })

      // like { 'two.sol': [ 'One', 'Two' ], 'origin.sol': [ 'Origin' ] }
      testTargets[targetFile] = contracts
    }

    try {
      fs.mkdirSync(path.join(this.config.working_directory, 'test_security'))
    } catch (e) {
      if (!e.code === 'EEXIST') {
        throw e
      }
    }

    for (let i = 0; i < Object.keys(testTargets).length; i++) {
      const ejbMainFile = path.join(__dirname, 'templates/main.js')
      const ejbContractFile = path.join(__dirname, 'templates/contract.js')

      const solFileName = Object.keys(testTargets)[i]

      const contractTemplates = []
      testTargets[solFileName].forEach(contractName => {
        ejs.renderFile(ejbContractFile, { contractName }, (err, template) => {
          if (err) throw err
          contractTemplates.push(template)
        })
      })

      ejs.renderFile(ejbMainFile, { solFileName, contractTemplates }, (err, template) => {
        if (err) throw err
        fs.writeFileSync(path.join(this.config.working_directory, 'test_security/test_' + solFileName + '_.js'), template)
        this.config.logger.log('./test_security/test_' + solFileName + '_.js was generated.')
      })
    }
    this.createSca2tConfig()
    this.addTestScripts()
  }

  createSca2tConfig () {
    const srcPath = path.join(__dirname, 'templates/sca2t-config.js')
    const destPath = path.join(this.config.working_directory, 'sca2t-config.js')

    try {
      // check existing. if it does not exist, statSync throws err.
      // if exists, do nothing
      fs.statSync(destPath)
      this.config.logger.log('./sca2t-config.js already exists.')
    } catch (err) {
      // if not exist, move template to destination.
      if (err.code === 'ENOENT') {
        fs.copyFileSync(srcPath, destPath)
        this.config.logger.log('./sca2t-config.js was generated.')
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
    if (!packageJson.scripts) {
      packageJson.scripts = {}
      this.config.logger.log('scripts object was added to package.json')
    }

    // if security is not defined, add it
    if (!packageJson.scripts['security']) {
      packageJson.scripts['security'] = 'mocha ./test_security --timeout 500000'
      this.config.logger.log('"security" script was added to package.json')
    } else {
      this.config.logger.log('"security" script already exists in package.json')
    }

    // if security-html is not defined, add it
    if (!packageJson.scripts['security-html']) {
      packageJson.scripts['security-html'] = 'mocha ./test_security --timeout 500000 --reporter mocha-simple-html-reporter --reporter-options output=security-report.html'
      this.config.logger.log('"security-html" script was added to package.json')
    } else {
      this.config.logger.log('"security-html" script already exists in package.json')
    }

    // update package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), { encoding: 'utf-8' })
  }
}

module.exports = {
  Generator
}
