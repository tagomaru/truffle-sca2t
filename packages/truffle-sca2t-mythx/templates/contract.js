  describe('<%= contractName %>', () => {
    let index;
    let report;
    before(async () => {
      for (index = 0; index < dataArrForAPI.length; index++) {
        if (dataArrForAPI[index].contractName === '<%= contractName %>') break;
      }

      // instanciate Report with data which was sent to MythX
      report = new Report(dataArrForAPI[index])
    })

    it('should be no error', async (done) => {
      if (analyzedResult[index].error) {
        let errStr = report.convertErrToStr(analyzedResult[index].error)

        if (errStr.includes('User or default timeout reached after') || errStr.includes('Timeout reached after')) {
          // if timeout, fails and shows UUID        
          done(new Error(`
  ${errStr}
Retrive the result with the above UUID later or try again.
          `))
        } else {
          done(new Error(`
MythX Error: ${errStr}
          `))
        }
      } else {
        done();
      }
    })

    it('should be no MythX log', async () => {
      assert(!analyzedResult[index].error, 'API returned Error')

      const logs = report.getMythXLogs(analyzedResult[index].issues[0])

      assert.equal(logs.length, 0, `
Mytx Logs:
${JSON.stringify(logs, null, 2)} 
UUID: ${analyzedResult[index].status.uuid}`)
    })

    it('should be no issue', async () => {
      assert(!analyzedResult[index].error, 'API returned Error')
      assert(analyzedResult[index].issues[0].issues, `issues is not set.`)
      const reports = report.getJsonReport(analyzedResult[index].issues[0], skippedSWCs)

      assert.equal(reports.length, 0, `
Vulnerabilities:
${JSON.stringify(reports, null, 2)}
UUID: ${analyzedResult[index].status.uuid}
      `)
    })
  })