const assert = require('assert')
const Runner = require('truffle-sca2t-mythx').Runner
const Report = require('truffle-sca2t-mythx').Report

/*
 * Setting: Armlet
 * You can change for you CI
 * Refer to https://github.com/ConsenSys/armlet for the detail
 */
const armletOptions = {
  initialDelay: 45 * 1000,  // 45 seconds
  timeout: 5 * 60 * 1000,    // 300 seconds
  noCacheLookup: false
}

/*
 * Setting: Report 
 * You can change for your CI
 */
// if you want skip some SWCs, set the SWCs like ['SWC-103']
const skippedSWCs = []

describe('<%- solFileName %>', () => {
  let runner;
  let compiledResults;
  let dataArrForAPI;
  let analyzedResult;

  before(async () => {
    const contractFile = '<%- solFileName %>'

    // instanciate Runner
    runner = new Runner(contractFile)

    // compile
    compiledResults = await runner.doCompile()

    // generate data which is sent to MythX
    dataArrForAPI = await runner.generateDataForAPI(compiledResults)

    // Login to MythX before analyzing
    await runner.login()

    // Analyze
    analyzedResult = await runner.doAnalyzes(dataArrForAPI, armletOptions)
  })

<% contractTemplates.forEach(contract => { %>
<%- contract %>
<% }) %> 
})
