module.exports = {
  mythx: {
    /*
     * Setting: Armlet
     * You can change for you CI
     * Refer to https://github.com/ConsenSys/armlet for the detail
    */
    armeltOptions : {
      initialDelay: 45 * 1000,  // 45 seconds
      timeout: 5 * 60 * 1000,    // 300 seconds
      noCacheLookup: false
    },

    /*
     * Setting: Report 
     * You can change for your CI
     * if you want skip some SWCs, set the SWCs like ['SWC-103']
     */
    skippedSWCs : [],

    /*
     * Setting: report format
     * You can choose 'json' or 'yaml'
     */
    reportFormat : 'json'
  }
}