const Report = class {
  constructor (data) {
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

  getJsonReport (issues, skippedSWCs = []) {
    if (!this.issues) {
      this.issues = issues
    }
    this.skippedSWCs = skippedSWCs

    const reports = []
    this.issues.issues.forEach(issue => {
      if (this.skippedSWCs.indexOf(issue.swcID) >= 0) {
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
