const { cli } = require('cli-ux')
// const Report = require('./report').Report
const Generator = require('./generator').Generator
const Runner = require('./runner').Runner
const fs = require('fs')
const path = require('path')

const Postman = class {
  constructor (config, targetFiles) {
    this.config = config
    this.targetFiles = targetFiles
  }

  async generateCollectionFile () {
    cli.action.start('Generating Postman collection file:')

    try {
    // get collection template
      const collection = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'templates/postman/pm-collection.json'), 'utf-8'))

      // get login request template
      const loginReq = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'templates/postman/pm-login-req.json'), 'utf-8'))

      // push login request in collection
      collection.item.push(loginReq)

      // get test targets
      // like { 'A.sol': [ 'A', 'B' ], 'C.sol': [ 'C' ] }
      const generator = new Generator(this.targetFiles, this.config)
      const testTargets = await generator.getTestTargets()

      for (let i = 0; i < Object.keys(testTargets).length; i++) {
        const solfile = Object.keys(testTargets)[i]

        // generate file folder item
        const fileFolderItem = {
          name: solfile,
          item: []
        }

        // generate contract folder item
        for (let j = 0; j < testTargets[solfile].length; j++) {
          const contractName = testTargets[solfile][j]
          const contractFolderItem = {
            name: contractName,
            item: []
          }

          // generate requests' items
          const submitReqBody = await this.generateSubmitReq(solfile, contractName)

          // push submit request in contract folder
          const submitReq = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'templates/postman/pm-submit-req.json'), 'utf-8'))
          submitReq.request.body.raw = JSON.stringify(submitReqBody)
          submitReq.event[0].script.exec[1] = `pm.environment.set("uuid_${solfile}_${contractName}", uuid)`
          contractFolderItem.item.push(submitReq)

          // push get status request in contract folder
          const getStatusReq = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'templates/postman/pm-get-status.json'), 'utf-8'))
          getStatusReq.request.url.raw = getStatusReq.request.url.raw + `{{uuid_${solfile}_${contractName}}}`
          getStatusReq.request.url.path[2] = `{{uuid_${solfile}_${contractName}}}`
          contractFolderItem.item.push(getStatusReq)

          // push get issues request in contract folder
          const getIssuesReq = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'templates/postman/pm-get-issues.json'), 'utf-8'))
          getIssuesReq.request.url.raw = getIssuesReq.request.url.raw + `{{uuid_${solfile}_${contractName}}}/issues`
          getIssuesReq.request.url.path[2] = `{{uuid_${solfile}_${contractName}}}`
          contractFolderItem.item.push(getIssuesReq)

          // push contract folder in file folder
          fileFolderItem.item.push(contractFolderItem)
        }
        // push file folder in collection
        collection.item.push(fileFolderItem)
      }

      fs.writeFileSync(path.resolve(this.config.working_directory, 'pm-collection-mythx.json'), JSON.stringify(collection, null, 2))
      cli.action.stop('done'.green)
      this.config.logger.log(`please import ${'./pm-collection-mythx.json'.cyan} in Postman`)
      this.config.logger.log(`Also, you should set ${'ethAddress'.cyan} and ${'password'.cyan} in Postman environment variables`)
    } catch (error) {
      cli.action.stop('fail'.red)
      throw error
    }
  }

  async generateSubmitReq (solfile, contractName) {
    const runner = new Runner(solfile, this.config)

    // compile
    const compiledResults = await runner.doCompile()

    // generate data arr
    const dataArrForAPI = await runner.generateDataForAPI(compiledResults)

    // get data
    const data = dataArrForAPI.filter(ele => {
      return ele.contractName === contractName && ele.sourceList.includes(path.resolve(this.config.contracts_directory, solfile))
    })

    if (data.length !== 1) {
      throw new Error('could not find target data.')
    }

    // generate reqBody
    const reqBody = runner.generateReqBody(data[0])

    return reqBody
  }
}

module.exports = {
  Postman
}
