const assert = require('assert')
const Runner = require('truffle-sca2t-mythx').Runner
const Report = require('truffle-sca2t-mythx').Report

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
    analyzedResult = await runner.doAnalyzes(dataArrForAPI)
  })

<% contractTemplates.forEach(contract => { %>
<%- contract %>
<% }) %> 
})
