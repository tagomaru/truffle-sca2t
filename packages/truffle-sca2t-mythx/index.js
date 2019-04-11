const Resolver = require('truffle-resolver')
const Runner = require('./lib/runner').Runner
const Report = require('./lib/report').Report
const Generator = require('./lib/generator').Generator

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

  const generator = new Generator(targetFiles, config)
  await generator.generate()
  config.logger.log('successfully done.'.green)
  config.logger.log('please execute "npm run security"'.green)
  config.logger.log('if you want html test report, "npm run security-html"'.green)
}

const printHelpMessage = (config) => {
  const message = `Usage: truffle run mythx [*file-name1* [*file-name2*] ...]
  e.g.: truffle run mythx fileA.sol fileB.sol`
  config.logger.log(message)
}

module.exports.Runner = Runner
module.exports.Report = Report
