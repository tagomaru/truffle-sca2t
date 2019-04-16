# truffle-sca2t (Smart Contract Audit Assistant Tool): A set of utilities for auditing Solidity contracts.

truffle-sca2t is a plugin of [Truffle framework](https://truffleframework.com/docs/truffle/overview). assistant tool for smart contract audit. This provides some utilities to help your smart contract auditing and make your smart contract more secure.

sca2t pronunciation is like skärt.

# Getting Started

Install it via npm:

```console
npm install -g truffle-sca2t
```

# Configuration
Add the following to `truffle.js` in the root directory of your Truffle project:
```javascript
module.exports = {
    plugins: [ "truffle-sca2t" ]
};
```

# Command List
## mythx
The `mythx` command generate test code files for [MythX](https://mythx.io/). The test files work as MythX client and report vulnerabilies, and some errors, and MythX Log. You can use the test code files for your CI.

### Usage
#### MythX Account
You can set up an account on the [MythX website](https://mythx.io) to get full access.

After setting up an account, set the following enviromment variables to your ETH address and password (add this to your `.bashrc` or `.bash_profile` for added convenience):
```bash
export MYTHX_ETH_ADDRESS=0x1234567891235678900000000000000000000000
export MYTHX_PASSWORD='Put your password in here!'
```

#### Generate Test Code Files
```bash
truffle run mythx fileA.sol
```
or multiple selection
```bash
truffle run mythx fileA.sol fileB.sol
```

You can set multiple files, however this command automatically search dependencies. For example,

A.sol
```solidity
pragma solidity ^0.5.0;
import "my-npm-pkg/contracts/C.sol";
contract A is C {}
contract B {}
```

C.sol
```solidity
pragma solidity ^0.5.0;
contract C {
  uint public a;
  function add(uint b) public {
    a = a + b;
  }
}
```

The command `truffle run mythx A.sol` generates test code file 'test_A.sol_.js' and the file include tests for `A` and `B`. The test for `A` also includes `C`. The test code file sends AST and source code for not only `A` but also `C` to MythX API.

That is why, you do not need to set dependencies.

If test code files are successfully generated, you can run mocha test.

```
npm run test:security
```

if you want html report (recommended), execute the below command.

```
npm run test:security:html
```

`security-report.html` is generated on your project root. The report file of the above `A` is like below. And you can see here.

#### Configuration For Your CI
This command automatically generates `sca2t-config.js` file on your project root for your setting. You can set report format, skipped SWCs, and so on.


## dependencies

The `dependencies` command outputs a draggable report to visualize dependencies among contracts.
Also this generates list of information of such as contract, function, etc.
This supports dependencies of inheritance, using declaration, and user defined type.
This searches package of EthPM and NPM for contracts

```console
truffle run dependencies fileA.sol
```

or

```console
truffle run dependencies fileA.sol fileB.sol
```


<img src="https://raw.githubusercontent.com/wiki/tagomaru/sca2t/images/dependencies.png" height="236">

## eventgen

The `eventgen` command inserts event decalaration and its call into all of the contracts and functions except view functions.
This helps you know which contract and function is called for contracts which rely on many other contracts.
Don't forget to backup your solidity files before doing this.

```console
truffle run eventgen contracts/fileA.sol contracts/fileB.sol
```
or

```console
find contracts -name "*.sol" | xargs truffle run eventgen
```

# License
MIT
