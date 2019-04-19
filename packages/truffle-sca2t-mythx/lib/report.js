const path = require('path')
const Config = require('truffle-config')
const json2yaml = require('json2yaml')

const Report = class {
  constructor (data, config) {
    if (config) {
      this.config = config
    } else {
      this.config = Config.detect()
    }
    this.data = data
  }

  getMythXLogs (issues) {
    if (!this.issues) {
      this.issues = issues
    }
    let logs = []
    if (this.issues.meta.logs) {
      this.issues.meta.logs.forEach(log => {
        logs.push(log)
      })
    }
    return logs
  }

  getJsonIssues (issues) {
    if (!this.issues) {
      this.issues = issues
    }

    let skippedSWCs
    try {
      // load skippedSWCs from config file.
      skippedSWCs = require(path.join(this.config.working_directory, 'sca2t-config.js')).mythx.skippedSWCs

      // if undefined, throw err
      if (!skippedSWCs) throw new Error('skippedSWCs is not defined.')
    } catch (err) {
      // set default value
      skippedSWCs = []
    }

    const reports = []
    this.issues.issues.forEach(issue => {
      if (skippedSWCs.indexOf(issue.swcID) >= 0) {
        return
      }
      const report = {
        swcID: issue.swcID,
        swcTitle: issue.swcTitle,
        description: issue.description,
        severity: issue.severity,
        locations: []
      }
      issue.locations.forEach(location => {
        const sourceMap = issue.locations[0].sourceMap
        const [start, len, fileID] = sourceMap.split(':')

        /*
        * API sometimes response like below. when send my/VulnerableParent.sol, API returns /my/VulnerableParent.sol as well.
        *     "sourceList": [
        *         "/my/VulnerableParent.sol",
        *         "/mnt/c/workdir/vscode_project/truffle-sca2t-test/contracts/VulnerableChild.sol",
        *         "my/VulnerableParent.sol"
        *     ],
        * Maybe this is problem at API side.
        * Temporary if this cannot find sourceFile related to fileID, remove '/' from sourceFile and search again
        */
        let sourceFile
        if (this.data.sourceList.indexOf(this.issues.sourceList[fileID]) >= 0) {
          sourceFile = this.data.sourceList[this.data.sourceList.indexOf(this.issues.sourceList[fileID])]
        } else {
          sourceFile = this.data.sourceList[this.data.sourceList.indexOf(this.issues.sourceList[fileID].substr(1))]
        }
        const source = this.data.sources[sourceFile].source
        const locationsEle = {
          file: sourceFile
        }
        locationsEle[`source (${start}:${parseInt(start) + parseInt(len)})`] = source.substr(start, len)
        report.locations.push(locationsEle)
      })
      reports.push(report)
    })
    return reports
  }

  getReport (jsonIssues) {
    let reportFormat
    try {
      // load skippedSWCs from config file.
      reportFormat = require(path.join(this.config.working_directory, 'sca2t-config.js')).mythx.reportFormat

      // if undefined, throw err
      if (!reportFormat) throw new Error('reportFormat is not defined.')
    } catch (err) {
      // set default value
      reportFormat = 'json'
    }

    let issues = []
    jsonIssues.forEach(vulnerability => {
      const title = `${vulnerability.description.head} (${vulnerability.severity})`
      vulnerability.description = vulnerability.description.tail
      delete vulnerability.severity
      const vulObj = { Title: title, Detail: vulnerability }
      issues.push(vulObj)
    })

    let report
    if (reportFormat === 'yaml') {
      report = json2yaml.stringify(issues)
    } else {
      // if not yaml, it is always 'json' format
      report = JSON.stringify(issues, null, 2)
    }
    return report.replace(/\\"/g, '\'').replace(/\\n/g, ' ')
  }

  convertErrToStr (err) {
    let errStr
    if (typeof err === 'string') {
      // It is assumed that err should be string here.
      errStr = `${err}`
    } else if (typeof err.message === 'string') {
      // If err is Error, get message property.
      errStr = err.message
    }
    return errStr
  }
}

module.exports = {
  Report
}
