const { cli } = require('cli-ux')
// const Report = require('./report').Report
const Generator = require('./generator').Generator
const fs = require('fs')
const path = require('path')

const Postman = class {
  constructor (config, targetFiles) {
    this.config = config
    this.targetFiles = targetFiles
  }

  async generateCollectionFile () {
    //
    cli.action.start(`Checking analysis status:`)
    // get collection template
    const collection = require('./templates/postman/pm-collection.json')

    // get login request template
    const loginReq = require('./templates/postman/pm-login-req.json')

    // push login request in collection
    collection.item.push(loginReq)

    // get test targets
    // like { 'A.sol': [ 'A', 'B' ], 'C.sol': [ 'C' ] }
    const generator = new Generator(this.targetFiles, this.config)
    const testTargets = await generator.getTestTargets()

    Object.keys(testTargets).forEach(solfile => {
      // generate file folder item
      const fileFolderItem = {
        name: solfile,
        item: []
      }

      // generate contract folder item
      testTargets[solfile].forEach(contractName => {
        const contractFolderItem = {
          name: contractName,
          item: []
        }
        // push contract folder in file folder
        fileFolderItem.item.push(contractFolderItem)
      })

      // push file folder in collection
      collection.item.push(fileFolderItem)
    })

    console.log(collection)

    fs.writeFileSync(path.resolve(this.config.working_directory, 'pm-collection-mythx.json'), JSON.stringify(collection, null, 2))

    cli.action.stop('done'.green)
  }
}

module.exports = {
  Postman
}
