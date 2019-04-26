const { cli } = require('cli-ux')
const Runner = require('./runner').Runner
const Report = require('./report').Report
const ejs = require('ejs')
const fs = require('fs')
const path = require('path')
const toc = require('markdown-toc')

const CLI = class {
  constructor (config, targetFiles) {
    this.config = config
    this.targetFiles = targetFiles
    if (this.config.markdown) {
      this.reports = {
        numOfHigh: 0,
        numOfMedium: 0
      }
    }
  }

  async doAnalyze () {
    this.config.logger.log('Start analysis in cli mode.')
    for (let i = 0; i < this.targetFiles.length; i++) {
      const contractFile = this.targetFiles[i]

      // instanciate Runner
      const runner = new Runner(contractFile)

      // compile
      cli.action.start(`Compiling: ${contractFile}`)
      let compiledResults
      try {
        compiledResults = await runner.doCompile()
      } catch (error) {
        cli.action.stop('failed'.red)
        throw error
      }
      cli.action.stop('done'.green)

      // generate data which is sent to MythX
      cli.action.start(`Generating data for MythX: ${contractFile}`)
      let dataArrForAPI
      try {
        dataArrForAPI = await runner.generateDataForAPI(compiledResults)
      } catch (error) {
        cli.action.stop('failed'.red)
        throw error
      }
      cli.action.stop('done'.green)

      // Login to MythX before analyzing
      cli.action.start(`Login to MythX: ${contractFile}`)
      try {
        await runner.login()
      } catch (error) {
        cli.action.stop('failed'.red)
        throw error
      }
      cli.action.stop('done'.green)

      // Analyze
      cli.action.start(`Analyzing: ${contractFile}`)
      let analyzedResult
      try {
        analyzedResult = await runner.doAnalyzes(dataArrForAPI)
      } catch (error) {
        cli.action.stop('failed'.red)
        throw error
      }
      cli.action.stop('done'.green)

      // report
      if (this.config.markdown) {
        this.prepareForMarkdown(dataArrForAPI, analyzedResult, contractFile)
      } else {
        this.doReport(dataArrForAPI, analyzedResult, contractFile)
      }
    }

    if (this.config.markdown) {
      this.generateMarkdownReport()
      this.config.logger.log('successfully generated.'.green)
      this.config.logger.log(`please open "${'./security-report.md'.cyan}" in some markdown viewer. (Viewer supporting GitHub Flavored Markdown is preferred)`)
    } else {
      this.config.logger.log('done.'.green)
    }
  }

  doReport (dataArrForAPI, analyzedResult, contractFile) {
    for (let i = 0; i < dataArrForAPI.length; i++) {
      const data = dataArrForAPI[i]
      const result = analyzedResult[i]
      const contractName = data.contractName
      this.config.logger.log(`\n### `.cyan + `${contractFile}: ${contractName}` + ` ###`.cyan)

      const report = new Report(data, this.config)

      // error check
      if (result.error) {
        const errStr = report.convertErrToStr(result.error)
        if (errStr.includes('User or default timeout reached after') || errStr.includes('Timeout reached after')) {
          this.config.logger.error(errStr.red)
          this.config.logger.error('Retrive the result with the above UUID later or try again.'.red)
        } else {
          this.config.logger.error(`MythX Error: ${errStr}\n`.red)
        }
        continue
      }

      // show vulnerability report
      const jsonIssues = report.getJsonIssues(result.issues[0])
      if (jsonIssues.length > 0) {
        this.config.logger.log(`${'=========== Vulnerability Report ================'.yellow}`)
        this.config.logger.log(`${(jsonIssues.length + ' vulnerabilities were found.').red}`)
        this.config.logger.log('\nVulnerabilities:')
        this.config.logger.log(`${report.getReport(jsonIssues)}`)
        this.config.logger.log(`${'=================================================\n'.yellow}`)
      } else {
        this.config.logger.log(`${'No vulnerability was found.\n'.green}`)
      }

      // MythX log check
      const logs = report.getMythXLogs()
      if (logs && logs.length > 0) {
        this.config.logger.log(`${'=========== MythX Logs ================'.yellow}`)
        this.config.logger.log(`${JSON.stringify(logs, null, 2)}`)
        this.config.logger.log(`${'======================================='.yellow}`)
        this.config.logger.log(`${'It may not have been analyzed correctly.\n'.red}`)
      }
    }
  }

  prepareForMarkdown (dataArrForAPI, analyzedResult, contractFile) {
    for (let i = 0; i < dataArrForAPI.length; i++) {
      const data = dataArrForAPI[i]
      const result = analyzedResult[i]
      const contractName = data.contractName

      if (!this.reports[contractFile]) {
        this.reports[contractFile] = {}
      }
      this.reports[contractFile][contractName] = {
        error: undefined,
        logs: undefined,
        jsonIssues: undefined
      }

      const report = new Report(data, this.config)

      // error check
      if (result.error) {
        const errStr = report.convertErrToStr(result.error)
        if (errStr.includes('User or default timeout reached after') || errStr.includes('Timeout reached after')) {
          this.reports[contractFile][contractName].error = errStr + `\nRetrive the result with the above UUID later or try again.`
        } else {
          this.reports[contractFile][contractName].error = `MythX Error: ${errStr}`
        }
        continue
      }

      // add issues
      const jsonIssues = report.getJsonIssues(result.issues[0])
      if (jsonIssues.length > 0) {
        this.reports[contractFile][contractName].jsonIssues = jsonIssues
      }

      // add MythX Log
      const logs = report.getMythXLogs()
      if (logs && logs.length > 0) {
        this.reports.contractFile.contractName.logs = logs
      }
    }
  }

  generateMarkdownReport () {
    let chapter = 2
    let clause = 1
    const detailMDs = []
    Object.keys(this.reports).forEach(contractFile => {
      Object.keys(this.reports[contractFile]).forEach(contractName => {
        let capterMD = `## ${chapter} Report | ${contractFile}: ${contractName}\n`

        const report = this.reports[contractFile][contractName]

        // generate md for error
        let errorMD = `* **MythX Error:**  \n`
        if (report.error) {
          errorMD = errorMD + report.error + '  \n'
        } else {
          errorMD = errorMD + 'N/A  \n'
        }

        // generate md for MythX Log
        let logMD = '* **MythX Log:**  \n'
        if (report.logs) {
          report.logs.forEach(log => {
            logMD = logMD + `${log.level}: ${log.msg}  \n`
          })
        } else {
          logMD = logMD + 'N/A  \n  \n'
        }

        // generate md for issues
        let issuesMD = ''
        const jsonIssues = report.jsonIssues
        if (jsonIssues) {
          jsonIssues.forEach(issue => {
            let severity = issue.severity
            if (severity === 'High') {
              severity = this.config.emoji ? `${severity} :scream:` : severity
              this.reports.numOfHigh++
            } else if (severity === 'Medium') {
              severity = this.config.emoji ? `${severity} :fearful:` : severity
              this.reports.numOfMedium++
            }
            const params = {
              chapter,
              clause: clause++,
              title: issue.description.head,
              severity: severity,
              swcID: issue.swcID,
              swcLink: 'https://smartcontractsecurity.github.io/SWC-registry/docs/' + issue.swcID,
              swcTitle: issue.swcTitle,
              description: issue.description.tail,
              file: issue.locations[0] ? issue.locations[0].file : '',
              source: issue.locations[0] ? Object.keys(issue.locations[0])[1] + '  ' : '  ',
              code: issue.locations[0] ? Object.values(issue.locations[0])[1] + '  ' : '  '
            }
            const ejbDetailFile = path.resolve(__dirname, 'templates/markdown/detail.md')
            ejs.renderFile(ejbDetailFile, params, (err, template) => {
              if (err) throw err
              issuesMD = issuesMD + template + '\n'
            })
          })
        } else {
          issuesMD = 'No vulnerability was found.'
        }

        // concat MDs and push
        let md = capterMD + errorMD + logMD + issuesMD
        detailMDs.push(md)
        chapter++
        clause = 1
      })
    })

    // generate main md
    const projectName = path.basename(this.config.working_directory)
    const params = {
      projectName: projectName,
      details: detailMDs,
      numOfHigh: this.reports.numOfHigh,
      numOfMedium: this.reports.numOfMedium
    }

    // generate report
    const ejbMainFile = path.resolve(__dirname, 'templates/markdown/main.md')
    ejs.renderFile(ejbMainFile, params, (err, template) => {
      if (err) throw err
      fs.writeFileSync(path.resolve(this.config.working_directory, 'security-report.md'), template.replace('{{table-of-contents}}', toc(template, { maxdepth: 2, firsth1: false }).content + '\n'))
    })
  }
}

module.exports = {
  CLI
}
