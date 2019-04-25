const Runner = require('./lib/runner').Runner
const Report = require('./lib/report').Report
const Generator = require('./lib/generator').Generator
const Analysis = require('./lib/get-analysis').Analysis
const Postman = require('./lib/postman').Postman
const CLI = require('./lib/cli').CLI
const path = require('path')

module.exports = async (config) => {
  // if help option is set, show help and return
  if (config.help) {
    printHelpMessage(config)
    return
  }

  // if uuid is set, retrive analysis report
  if (config.uuid) {
    await getAnalysisWithUUID(config)
    return
  }

  // retrieve target files from arguments.
  let targetFiles = config._.length > 1 ? config._.slice(1, config._.length) : null

  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run mythx [*file-name1* [*file-name2*] ...]')
    config.logger.error(' e.g.: truffle run mythx contracts/fileA.sol contracts/sub/fileB.sol')
    return
  }

  // delete 'contracts + path.sep' from targetFile if it exists
  targetFiles = targetFiles.map(targetFile => {
    if (targetFile.startsWith(`contracts${path.sep}`)) {
      const offset = `contracts${path.sep}`.length
      return targetFile.substr(offset)
    } else {
      return targetFile
    }
  })

  // if postman is set, generate postman collection file
  if (config.postman) {
    await generatePostmanCollection(config, targetFiles)
    return
  } else if (config.cli) {
    await cliAnalysis(config, targetFiles)
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
  e.g.: truffle run mythx contracts/fileA.sol contracts/sub/fileB.sol

Options:
  --help      print help.
  --uuid      get analysis report with UUID.
  --postman   generate Postman collection file.
  --cli       analyze in cli mode.
  --markdown  generate markdown format report in cli mode.
  --emoji     insert emoji in markdown format report. (Only support GitHub Flavored Markdown)
`
  config.logger.log(message)
}

const getAnalysisWithUUID = async (config) => {
  const analysis = new Analysis(config)
  await analysis.getAnalysis()
}

const generatePostmanCollection = async (config, targetFiles) => {
  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run mythx --postman [*file-name1* [*file-name2*] ...]')
    config.logger.error(' e.g.: truffle run mythx --postman contracts/fileA.sol contracts/sub/fileB.sol')
    return
  }
  const pm = new Postman(config, targetFiles)
  await pm.generateCollectionFile()
}

const cliAnalysis = async (config, targetFiles) => {
  const cli = new CLI(config, targetFiles)
  await cli.doAnalyze()
}

module.exports.Runner = Runner
module.exports.Report = Report
