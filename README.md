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

```console
truffle run mythx A.sol
```

or multiple selection

```console
truffle run mythx A.sol B.sol
```

You can set multiple files, however this command automatically search dependencies.

```solidity
pragma solidity ^0.5.0;
import "./C.sol";
contract A is C {}
contract B {}
```

```solidity
pragma solidity ^0.5.0;
contract C {}
```

The command `truffle run mythx A.sol` generates test code file 'test_A.sol_.js' and the file include tests for `A` and `B`. The test `A` includes `C`. The test code file sends AST and source code for not only `A` but also `C`.

```json
{
  "data": {
    "contractName": "A",
    "bytecode": "0x6080...",
    "sourceMap": "42:18:0:...",
    "deployedBytecode": "0x6080...",
    "deployedSourceMap": "42:18:0:...",
    "sourceList": [
      "/contracts/A.sol",
      "/contracts/C.sol"
    ],
    "sources": {
      "/contracts/A.sol": {
        "source": "pragma solidity ^0.5.0;\nimport \"./C.sol\";\ncontract A is C {}\ncontract B {}",
        "ast": {...}
      },
      "/contracts/C.sol": {
        "source": "pragma solidity ^0.5.0;\ncontract C {}",
        "ast": {...}
      }
    },
    "verion": "...",
    "analysisMode": "quick"
  },
  (removed)
}
```

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
