// require section
const antlr4 = require('antlr4/index')
const SolidityLexer = require('./lib/SolidityLexer').SolidityLexer
const SolidityParser = require('./lib/SolidityParser').SolidityParser
const EventgenSolidityListener = require('./lib/EventgenSolidityListener').EventgenSolidityListener
const fs = require('fs')
const conif = require('node-console-input')

module.exports = async (config) => {
  if (config.help) {
    printHelpMessage(config)
    return
  }

  const targetFiles = config._.length > 1 ? config._.slice(1, config._.length) : null

  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run eventgen [*filepath1* [*filepath2*] ...]')
    config.logger.error(' e.g.: truffle run eventgen contracts/fileA.sol contracts/fileB.sol')
    config.logger.error(' e.g.: find contracts -name "*.sol" | xargs truffle run eventgen')
    return
  }

  // confirm wether backup is done
  const done = conif.getConsoleInput('Backup of your files is done? (y/N): ')
  if (done !== 'y') {
    config.logger.log('stop...')
    return
  }

  eventgen(targetFiles, config)
}

const eventgen = (files, config) => {
  let failures = []
  let successes = []
  files.forEach(file => {
    try {
      // generate event per file.
      if (processFile(file, config)) {
        config.logger.log(`[SUCCESS]: ${file}`)
        successes.push(file)
      }
    } catch (e) {
      config.logger.error(`[FAIL]: ${file}`.red)
      failures.push(file)
    }
  })

  // show summary
  config.logger.log()
  config.logger.log('=== SUMMARY ===')
  config.logger.log(`${successes.length} file(s) succeeded.`)
  config.logger.log(`  ${successes.join('\n  ')}`)
  config.logger.log()
  config.logger.log(`${failures.length} file(s) failed.`)
  config.logger.log(`  ${failures.join('\n  ')}`)
  config.logger.log('===============')
}

const processFile = (file, config) => {
  // Read file
  let content
  try {
    content = fs.readFileSync(file).toString('utf-8')
  } catch (e) {
    if (e.code === 'EISDIR') {
      config.logger.error(`Skiping directory ${file}`)
      return false
    } else throw e
  }

  // variables which are relavant to antlr4
  const chars = new antlr4.InputStream(content)
  const lexer = new SolidityLexer(chars)
  const tokens = new antlr4.CommonTokenStream(lexer)
  const parser = new SolidityParser(tokens)
  const tree = parser.sourceUnit()
  let listener = new EventgenSolidityListener(tokens, parser)

  // tree walking of solidity
  antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree)

  const indent = '  ' // indent
  let modContent = content // modified content
  let offset = 0 // this offset will be incremented every inserting event.

  // process each contract
  listener.contractNames.forEach(conName => {
    let contract = listener.contracts[conName]

    // add event definition
    const addedEventDef = `event SCA2T(string sca2tMsg);\n${indent}`
    const conBodyStart = contract.bodyStart
    modContent = modContent.slice(0, conBodyStart + offset) + addedEventDef + modContent.slice(conBodyStart + offset)
    offset += addedEventDef.length

    // add event call per function
    contract.functions.forEach(func => {
      let addedEventCall = `\n${indent}${indent}emit SCA2T("[${conName}]: ${func.name} was called.");`
      if (func.isEmpty) {
        addedEventCall += `\n${indent}`
      }
      modContent = modContent.slice(0, func.bodyStart + offset + 1) + addedEventCall + modContent.slice(func.bodyStart + offset + 1)
      offset += addedEventCall.length
    })
  })

  // replace original file with modContent
  fs.writeFileSync(file, modContent)

  return true
}

const printHelpMessage = (config) => {
  const message = `Usage: truffle run eventgen [*filepath1* [*filepath2*] ...]
 e.g.: truffle run eventgen contracts/fileA.sol contracts/fileB.sol
 e.g : find contracts -name "*.sol" | xargs truffle run eventgen`
  config.logger.log(message)
}
