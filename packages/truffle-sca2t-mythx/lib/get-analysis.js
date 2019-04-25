const armlet = require('armlet')
const { cli } = require('cli-ux')
const Resolver = require('truffle-resolver')
const Report = require('./report').Report

const Analysis = class {
  constructor (config) {
    this.config = config
    if (!this.config.resolver) {
      this.config.resolver = new Resolver(this.config)
    }
  }

  async getAnalysis () {
    // set uuid
    const uuid = this.config.uuid

    // Get armlet instance
    const ethAddress = process.env.MYTHX_ETH_ADDRESS
    const password = process.env.MYTHX_PASSWORD
    const client = new armlet.Client({ ethAddress, password })

    // Check analysis status with UUID
    cli.action.start(`Checking analysis status: ${uuid}`)
    try {
      const result = await client.getStatus(uuid)
      if (result.status !== 'Finished') {
        cli.action.stop('done'.green)
        this.config.logger.error(`The job status is still '${result.status}'.`.red)
        this.config.logger.error('Please retry later.')
        return
      }
    } catch (error) {
      cli.action.stop('failed'.red)
      throw error
    }

    cli.action.stop('done'.green)

    // Retrive analysis results with UUID
    let result
    cli.action.start(`Retrieving analysis results: ${uuid}`)
    try {
      result = await client.getIssues(uuid)
    } catch (error) {
      cli.action.stop('failed'.red)
      throw error
    }
    cli.action.stop('done'.green)

    // generate data for Report
    const sourceList = result[0].sourceList
    const data = {
      sourceList,
      sources: {}
    }
    for (let i = 0; i < sourceList.length; i++) {
      const targetPath = sourceList[i]
      const { body } = await this.getSourceCode(targetPath).catch(e => { throw e })
      data.sources[targetPath] = { source: body }
    }

    // report
    const report = new Report(data, this.config)
    const jsonIssues = report.getJsonIssues(result[0])
    if (jsonIssues.length > 0) {
      this.config.logger.log(`${'=========== Vulnerability Report ================'.yellow}`)
      this.config.logger.log(`${(jsonIssues.length + ' vulnerabilities were found.').red}`)
      this.config.logger.log('\nVulnerabilities:')
      this.config.logger.log(`${report.getReport(jsonIssues)}`)
      this.config.logger.log(`${'=================================================\n'.yellow}`)
    } else {
      this.config.logger.log(`${'No vulnerability was found.'.green}`)
    }

    // mythx log report
    const logs = report.getMythXLogs()
    if (logs && logs.length > 0) {
      this.config.logger.log(`${'=========== MythX Logs ================'.yellow}`)
      this.config.logger.log(`${JSON.stringify(logs, null, 2)}`)
      this.config.logger.log(`${'======================================='.yellow}`)
      this.config.logger.log(`${'It may not have been analyzed correctly\n'.red}`)
    }
  }

  async getSourceCode (targetPath) {
    return new Promise(async (resolve, reject) => {
      const callback = (err, body, resolvedPath) => {
        if (err) {
          reject(err)
        }
        resolve({ body, resolvedPath })
      }
      await this.config.resolver.resolve(targetPath, this.config.working_directory, callback)
    })
  }
}

module.exports = {
  Analysis
}
