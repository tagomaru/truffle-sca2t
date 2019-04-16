const fs = require('fs')
const path = require('path')
const parser = require('solidity-parser-antlr')
// const Profiler = require("truffle-compile/profiler");
// const Resolver = require("truffle-resolver");

const definition = {
  contracts: {}, inheritances: [], uses: [], functions: {}, modifiers: {}, states: {}
}

module.exports = async (config) => {
  if (config.help) {
    printHelpMessage(config)
    return
  }

  const targetFiles = config._.length > 1 ? config._.slice(1, config._.length) : null

  if (!targetFiles) {
    config.logger.error('please set solidity file'.red)
    config.logger.error('Usage: truffle run dependencies [*file-name1* [*file-name2*] ...]')
    config.logger.error(' e.g.: truffle run dependencies fileA.sol fileB.sol')
    return
  }

  targetFiles.forEach(async (file) => {
    const targetFileAbs = path.join(config.contracts_directory, file)
    if (!fs.existsSync(targetFileAbs)) {
      config.logger.error(`${file} does not exist. skipping...`.red)
      return
    }
    try {
      await analyze(targetFileAbs, config)
    } catch (e) {
      config.logger.error(e)
    }
  })

  reportGenerate(definition)
  config.logger.log('done.')
  config.logger.log('open ./dependencies.html'.green)
}

/*
const getRequiredSources = async (file, config) => {
    return new Promise((resolve, reject) => {
        Profiler.required_sources(
            config.with({
              paths: [file],
              base_path: config.contracts_directory,
              resolver: config.resolver,
            }),
            (err, allSources, required) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(allSources);
                }

          });
    });
}
*/

const analyze = async (file, config) => {
  let content
  const dependencies = {}
  try {
    content = fs.readFileSync(file).toString('utf-8')
  } catch (e) {
    if (e.code === 'EISDIR') {
      config.log.error(`Skipping directory ${file}`)
      return false
    } throw e
  }

  const ast = parser.parse(content)
  const imports = new Map()

  // search all of the contracts on this file.
  parser.visit(ast, {
    ContractDefinition (node) {
      const contractName = node.name
      if (!definition.contracts[contractName] || definition.contracts[contractName] === null) {
        definition.contracts[contractName] = { path: file.replace(/\\/g, '&#92;').replace(/:/g, '&#58;') }
      }
    }
  })

  parser.visit(ast, {
    ImportDirective (node) {
      const contractName = path.parse(node.path).name
      let absPath
      if (node.path.startsWith('.')) {
        const currentDir = path.resolve(path.parse(file).dir)
        absPath = path.resolve(path.join(currentDir, node.path))
      } else if (path.isAbsolute(node.path)) {
        absPath = node.path
      } else {
        absPath = getModulesInstalledPath(node.path, config)
      }

      imports.set(contractName, absPath)
    },

    // parse contract
    ContractDefinition (node) {
      const contractName = node.name

      dependencies[contractName] = node.baseContracts.map(spec => spec.baseName.namePath)

      for (let i = dependencies[contractName].length - 1; i >= 0; i--) {
        const dep = dependencies[contractName][i]
        if (!definition.contracts[dep]) {
          definition.contracts[dep] = null
        }

        if (definition.inheritances.indexOf(`${contractName}=>${dep}`) === -1) {
          definition.inheritances.push(`${contractName}=>${dep}`)
          if (imports.has(dep)) {
            // recursive
            analyze(imports.get(dep), config)
          }
        }
      }

      // using list
      const using = []

      // function list
      const funcDefs = []

      // modifiers list
      const modifiers = []

      // states list
      const states = []

      // visit contract body
      parser.visit(node.subNodes, {
        // add using declaration
        UsingForDeclaration (node) {
          const { libraryName } = node
          using.push(libraryName)
        },

        // add function definition
        FunctionDefinition (node) {
          let funcDef
          let name
          if (node.name === null) {
            name = '&quot;constructor&quot;'
          } else if (node.name === '') {
            name = '&quot;fallback&quot;'
          } else {
            name = node.name
          }
          const { visibility } = node
          const { modifiers } = node
          const { stateMutability } = node
          const { isConstructor } = node
          funcDef = {
            name, visibility, modifiers, stateMutability, isConstructor
          }
          funcDefs.push(funcDef)
        },

        // add modifier definition
        ModifierDefinition (node) {
          modifiers.push(node.name)
        },

        // add state definition
        StateVariableDeclaration (node) {
          // console.log(Object.getOwnPropertyNames(node));

          if (node.variables.length !== 1) {
            throw new Error(`Lenght of State Variable is only 1, but ${node.variables.length}`)
          }

          const variable = node.variables[0]
          const { name } = variable
          const { visibility } = variable
          const isConst = variable.isDeclaredConst
          const typeName = variable.typeName.type
          let type
          switch (typeName) {
            case 'ElementaryTypeName':
              type = variable.typeName.name
              break
            case 'ArrayTypeName':
              type = 'array'
              break
            case 'Mapping':
              type = 'mapping'
              break
            case 'UserDefinedTypeName':
              type = variable.typeName.namePath
              break
            default:
              type = typeName
          }

          states.push({
            name, type, visibility, isConst
          })
        },

        // add user defined type contract
        UserDefinedTypeName (node) {
          const name = node.namePath
          if (definition.contracts[name] || imports.has(name)) {
            using.push(name)
          }
        },

        // add member access for like 'ConvertLiv.convert'. In this case, this gets 'ConvertLiv'.
        // Or if it is like 'Token.(_address)', then this gets 'Token'.
        MemberAccess (node) {
          parser.visit(node, {
            Identifier (node) {
              const { name } = node
              if (definition.contracts[name] || imports.has(name)) {
                using.push(name)
              }
            }
          })
        }
      })

      // add functions to definition
      if (!definition.functions[contractName]) {
        definition.functions[contractName] = funcDefs
      }

      // add modifiers to definition
      if (!definition.modifiers[contractName]) {
        definition.modifiers[contractName] = modifiers
      }

      // add states to definition
      if (!definition.states[contractName]) {
        definition.states[contractName] = states
      }

      for (const dep of using) {
        if (!definition.contracts[dep]) {
          definition.contracts[dep] = null
        }

        if (definition.uses.indexOf(`${contractName}=>${dep}`) === -1) {
          definition.uses.push(`${contractName}=>${dep}`)
          if (imports.has(dep)) {
            // recursive
            analyze(imports.get(dep), config)
          }
        }
      }
    }
  })
  return true
}

const reportGenerate = (definition) => {
  // remove CR, LE, and space from definition
  const outputJSON = JSON.stringify(definition).replace(/\r|\n|\s/g, '')

  // load jspulub and jquery
  const jsplumbDefaultsCss = fs.readFileSync(`${__dirname}/node_modules/jsplumb/css/jsplumbtoolkit-defaults.css`).toString()
  const jsPlumbJs = fs.readFileSync(`${__dirname}/node_modules/jsplumb/dist/js/jsplumb.min.js`).toString()
  const jquery = fs.readFileSync(`${__dirname}/node_modules/jquery/dist/jquery.min.js`).toString()

  // load template html
  const template = fs.readFileSync(`${__dirname}/resources/template.html`).toString()

  // generate file name.
  const outputFileName = 'dependencies.html'

  // generate report
  let output = template.replace(/{{definition}}/g, outputJSON)
  output = output.replace(/{{jsplumbtoolkit-defaults.css}}/g, jsplumbDefaultsCss)
  output = output.replace(/{{jsplumb.min.js}}/g, jsPlumbJs)
  output = output.replace(/{{jquery.min.js}}/g, jquery)
  fs.writeFileSync(process.cwd() + path.sep + outputFileName, output)

  return outputFileName
}

const getModulesInstalledPath = (importPath, config) => {
  const separator = importPath.indexOf('/')
  const packageName = importPath.substring(0, separator)
  const internalPath = importPath.substring(separator + 1)
  const installDir = config.working_directory

  let filePath

  // check EthPM
  filePath = path.join(installDir, 'installed_contracts', importPath)
  if (fs.existsSync(filePath)) {
    return filePath
  }
  filePath = path.join(installDir, 'installed_contracts', packageName, 'contracts', internalPath)
  if (fs.existsSync(filePath)) {
    return filePath
  }

  // check NPM
  filePath = path.join(installDir, 'node_modules', importPath)
  if (fs.existsSync(filePath)) {
    return filePath
  }
}

const printHelpMessage = (config) => {
  const message = `Usage: truffle run dependencies [options] [*contract-name1* [*contract-name2*] ...]
 e.g.: truffle run dependencies fileA.sol fileB.sol`
  config.logger.log(message)
}
