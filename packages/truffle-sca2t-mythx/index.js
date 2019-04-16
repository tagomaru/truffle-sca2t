const Runner = require('./lib/runner').Runner
const Report = require('./lib/report').Report
const Generator = require('./lib/generator').Generator

module.exports = async (config) => {
  // if help option is set, show help and return
  if (config.help) {
    printHelpMessage(config)
    return
  }

  // retrieve target files from arguments.
  const targetFiles = config._.length > 1 ? config._.slice(1, config._.length) : null

  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run mythx [*file-name1* [*file-name2*] ...]')
    config.logger.error(' e.g.: truffle run mythx fileA.sol fileB.sol')
    return
  }

  const generator = new Generator(targetFiles, config)
  await generator.generate()
  config.logger.log('\nsuccessfully done.\n'.green)
  config.logger.log('please execute', '"npm run test:security"'.cyan, 'for your test')
  config.logger.log('if you want html test report,', '"npm run test:security:html"'.cyan)
}

const printHelpMessage = (config) => {
  const message = `Usage: truffle run mythx [*file-name1* [*file-name2*] ...]
  e.g.: truffle run mythx fileA.sol fileB.sol`
  config.logger.log(message)
}

module.exports.Runner = Runner
module.exports.Report = Report
