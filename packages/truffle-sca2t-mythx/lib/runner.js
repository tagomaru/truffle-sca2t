const armlet = require('armlet')
const path = require('path')
const truffleCompile = require('truffle-compile')
const CompilerSupplier = truffleCompile.CompilerSupplier
const Profiler = require('truffle-compile/profiler')
const Resolver = require('truffle-resolver')
const Config = require('truffle-config')

const Runner = class {
  constructor (contractFile) {
    this.config = new Config()
    if (!this.config.resolver) {
      this.config.resolver = new Resolver(this.config)
    }
    this.targetFile = path.resolve(this.config.contracts_directory, contractFile)
  }

  async doCompile () {
    const config = this.config
    this.allSources = {}
    // Load compiler
    const supplier = new CompilerSupplier(config.compilers.solc)
    await supplier
      .load()
      .then(async solc => {
        const resolved = await Profiler.resolveAllSources(config.resolver, [this.targetFile], solc)

        const resolvedPaths = Object.keys(resolved)
        resolvedPaths.forEach(file => {
          this.allSources[file] = resolved[file].body
        })
      })

    const results = await this.compile()
    return results
  }

  async compile () {
    let truffleCompileWrapper = () => {
      return new Promise((resolve, reject) => {
        truffleCompile(this.allSources, this.config, (err, compiledOutput, files, compilerInfo) => {
          if (err) {
            reject(err)
          } else {
            resolve({ compiledOutput, files, compilerInfo })
          }
        })
      })
    }

    try {
      const results = await truffleCompileWrapper()
      return results
    } catch (e) {
      throw e
    }
  }

  async generateDataForAPI (compiledResults) {
    const { compiledOutput, files, compilerInfo } = compiledResults
    const targetContracts = Object.values(compiledOutput).filter(contract => {
      return contract.sourcePath === this.targetFile
    })
    const dataArr = []

    targetContracts.forEach(contract => {
      const data = {
        contractName: contract.contract_name,
        bytecode: contract.bytecode,
        sourceMap: contract.sourceMap,
        deployedBytecode: contract.deployedBytecode,
        deployedSourceMap: contract.deployedSourceMap,
        sourceList: files,
        sources: {},
        verion: compilerInfo.version,
        analysisMode: 'quick'
      }

      Object.keys(this.allSources).forEach(sourcePath => {
        data.sources[sourcePath] = {
          source: this.allSources[sourcePath]
        }
        let ast
        Object.values(compiledOutput).forEach(ele => {
          if (ele.sourcePath === sourcePath) {
            ast = ele.ast
          }
        })
        data.sources[sourcePath].ast = ast
      })
      dataArr.push(data)
    })

    return dataArr
  }

  async login () {
    const ethAddress = process.env.MYTHX_ETH_ADDRESS
    const password = process.env.MYTHX_PASSWORD
    this.client = new armlet.Client({ ethAddress, password })
    await this.client.login()
  }

  async doAnalyzes (dataArr, armletOptions) {
    this.armletOptions = armletOptions
    let promises = []
    for (let dataID = 0; dataID < dataArr.length; dataID++) {
      promises.push(this.analyze(dataID, dataArr[dataID]))
    }

    const results = await Promise.all(promises)
      .then((results) => {
        let sortedResultsWithDataID = []
        results.forEach(ele => {
          Object.keys(ele).forEach(dataID => {
            sortedResultsWithDataID[dataID] = ele[dataID]
          })
        })
        return sortedResultsWithDataID
      })
      .catch(e => {
        throw e
      })

    return results
  }

  async analyze (dataID, data) {
    return new Promise(async (resolve, reject) => {
      let obj = {}
      try {
        let results = await this.client.analyzeWithStatus(
          {
            data,
            clientToolName: 'truffle-sca2t',
            noCacheLookup: this.armletOptions.noCacheLookup,
            initialDelay: this.armletOptions.initialDelay,
            timeout: this.armletOptions.timeout
          }
        )

        if (results.status.status === 'Error') {
          obj[dataID] = { error: results.status }
        } else {
          obj[dataID] = results
        }
        resolve(obj)
      } catch (err) {
        let errStr
        if (typeof err === 'string') {
          // It is assumed that err should be string here.
          errStr = `${err}`
        } else if (typeof err.message === 'string') {
          // If err is Error, get message property.
          errStr = err.message
        }
        obj[dataID] = { error: errStr }
        resolve(obj)
      }
    })
  }
}

module.exports = {
  Runner
}
