const fs = require('fs')
const path = require('path')
const Resolver = require('truffle-resolver')
const Runner = require('./lib/runner').Runner
const Report = require('./lib/report').Report
const ejs = require('ejs')

module.exports = async (config) => {
  if (config.help) {
    printHelpMessage(config)
    return
  }

  const targetFiles = config._.length > 1 ? config._.slice(1, config._.length) : null

  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run mythx [*file-name1* [*file-name2*] ...]')
    config.logger.error(' e.g.: truffle run mythx fileA.sol fileB.sol')
    return
  }

  if (!config.resolver) {
    config.resolver = new Resolver(config)
  }

  const testTargets = {}
  for (let i = 0; i < targetFiles.length; i++) {
    const targetFile = targetFiles[i]
    const runner = new Runner(targetFile)
    const results = await runner.doCompile()

    // like { 'two.sol': [ 'One', 'Two' ], 'origin.sol': [ 'Origin' ] }
    testTargets[targetFile] = Object.keys(results.compiledOutput)
  }

  try {
    fs.mkdirSync('./test_security')
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
      fs.writeFileSync('./test_security/test_' + solFileName + '_.js', template)
    })

    // fs.writeFileSync('./test_security/test_' + Object.keys(testTargets)[i] + '_.js', html)
  }
}

const printHelpMessage = (config) => {
  const message = `Usage: truffle run mythx [*file-name1* [*file-name2*] ...]
  e.g.: truffle run mythx fileA.sol fileB.sol`
  config.logger.log(message)
}

module.exports.Runner = Runner
module.exports.Report = Report
