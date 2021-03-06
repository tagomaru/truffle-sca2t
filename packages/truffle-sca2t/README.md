[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
# truffle-sca2t (Smart Contract Audit Assistant Tool): A set of utilities for auditing Solidity contracts.

truffle-sca2t is a plugin of [Truffle framework](https://truffleframework.com/docs/truffle/overview) and an assistant tool for smart contract auditing. This provides some utilities to help your smart contract auditing and make your smart contract more secure and safe. The plugin is compatible with Truffle 5.0 or higher.

sca2t pronunciation is like `skärt`.

- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Command List](#command-list)
  * [1. mythx](#1-mythx)
    + [1-1. Generate Test Code File of mocha](#1-1-generate-test-code-file-of-mocha)
    + [1-2. Postman Support](#1-2-postman-support)
    + [1-3. Command Line Interface Mode](#1-3-command-line-interface-mode)
    + [1-4. Advanced Options](#1-4-advanced-options)
  * [2. dependencies](#2-dependencies)
  * [3. eventgen](#3-eventgen)
- [License](#license)

# Getting Started

Install it via npm:

```
$ npm install truffle-sca2t
```
If you want to install it globally, you need to install it with [mocha](https://www.npmjs.com/package/mocha) and [mocha-simple-html-reporter](https://www.npmjs.com/package/mocha-simple-html-reporter).
```
$ npm install -g truffle-sca2t mocha mocha-simple-html-reporter
```

# Configuration
Add the following to `truffle-config.js` in the root directory of your Truffle project:
```javascript
module.exports = {
    plugins: [ "truffle-sca2t" ]
};
```

# Command List
## 1. mythx
The `mythx` command generate test code files for [MythX](https://mythx.io/). The test files work as MythX client and report vulnerabilies, and some errors, and MythX Log. You can integrate the test code files in your CI because the test code files never depend on specific CI products such as Circle CI, Travis CI, Jenkins, and so on. You can see [sample project](https://github.com/tagomaru/truffle-sca2t-sample) and the [test result on CircleCI](https://circleci.com/gh/tagomaru/truffle-sca2t-sample/2).
Also this command can generate [Postman](https://www.getpostman.com/) Collection File for lovers of Postman.  
If you just want to use this as MythX client tool, you can use command line interface mode.

### 1-1. Generate Test Code File of mocha
#### 1-1-1. MythX Account
You can set up an account on the [MythX website](https://mythx.io) to get full access.

After setting up an account, set the following enviromment variables to your ETH address and password (add this to your `.bashrc` or `.bash_profile` for added convenience):
```bash
export MYTHX_ETH_ADDRESS=0x1234567891235678900000000000000000000000
export MYTHX_PASSWORD='Put your password in here!'
```

#### 1-1-2. Generate Test Code Files
```
$ truffle run mythx fileA.sol
```
or multiple selection
```
$ truffle run mythx fileA.sol fileB.sol
```
The below is also fine. (tab autocompletion support)
```
$ truffle run mythx contracts/fileA.sol contracts/fileB.sol
```

You can set multiple files, however this command automatically searches dependencies. For example,

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

The command `truffle run mythx A.sol` generates test code file 'test_A.sol_.js' and the file include tests for `A` and `B`. The test for `A` also includes the test for `C`. The test code file sends AST and source code for not only `A` but also `C` to MythX API at the same time. You can see the sent data [here](https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/data1.json). 

That is why, you do not need to set files which the main contract file depends on.

#### 1-1-3. Configuration For Your CI
This command automatically generates `sca2t-config.js` file on your project root for your setting. You can set report format, skipped SWCs, and so on.

#### 1-1-4. Run The Test Code Files
If test code files are successfully generated, you can run mocha test.

```
$ npm run test:security
```

If you want a beautiful html report (recommended), execute the below command.

```
$ npm run test:security:html
```

`security-report.html` is generated on your project root. The report file of the above `A` is like below. As you can see, the file reports the vulnerability of `C`.

<img src="https://raw.githubusercontent.com/tagomaru/static-for-github/master/truffle-sca2t/truffle-sca2t-mythx/sample-report1.jpg">

And you can see the report [here](http://htmlpreview.github.io/?https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/security-report1.html).

#### 1-1-5. Get analysis (if timeout happens)
If timeout happens, you can get analysis later with UUID which the test shows.
```
$ truffle run mythx --uuid='your UUID'
```

### 1-2. Postman Support
#### 1-2-1. Genereta Postman Collection File
If you want to dive into http raw request/response, use postman option.
This generates [Postman](https://www.getpostman.com/) Collection file which sends same requests as the mocha test code does.
```
$ truffle run mythx contracts/fileA.sol --postman
```
or multiple selection
```
$ truffle run mythx contracts/fileA.sol contracts/fileB.sol --postman
```
#### 1-2-2. Import Postman Collection File in Postman
Import the generated file in Postman.
You should set `ethAddress` and `password` in Postman environment variables.

Currently, this supports the below requests.
1. login
2. submit analysis
3. get status
4. get issues

### 1-3. Command Line Interface Mode
If you do not need test code files, you can analyze without test code files. Just add `--cli` option.
```
$ truffle run mythx contracts/fileA.sol contracts/fileB.sol --cli
```
By adding `--markdown` option, you can get markdown format report. 
```
$ truffle run mythx contracts/fileA.sol contracts/fileB.sol --cli --markdown
```

* **report image**
<img src="https://raw.githubusercontent.com/tagomaru/static-for-github/master/truffle-sca2t/truffle-sca2t-mythx/sample-report-md1.jpg">

The sample is [here](https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/security-report.md).
(the `emoji` is option.)

### 1-4. Advanced Options
Run `truffle run mythx --help` to show advanced configutation options.
```console
$ truffle run mythx --help
Usage: truffle run mythx [*file-name1* [*file-name2*] ...]
  e.g.: truffle run mythx contracts/fileA.sol contracts/sub/fileB.sol

Options:
  --help      print help.
  --uuid      get analysis report with UUID.
  --postman   generate Postman collection file.
  --cli       analyze in cli mode.
  --markdown  generate markdown format report in cli mode.
  --emoji     insert emoji in markdown format report. (Only support GitHub Flavored Markdown)
```

## 2. dependencies

The `dependencies` command outputs a draggable report to visualize dependencies among contracts.
Also this generates list of information of such as contract, function, etc.
This supports dependencies of inheritance, using declaration, and user defined type.
This searches package of EthPM and NPM for contracts

```
$ truffle run dependencies fileA.sol
```

or

```
$ truffle run dependencies fileA.sol fileB.sol
```

<img src="https://raw.githubusercontent.com/wiki/tagomaru/sca2t/images/dependencies.png" height="236">

## 3. eventgen

The `eventgen` command inserts event decalaration and its call into all of the contracts and functions except view functions.
This helps you know which contract and function is called for contracts which rely on many other contracts.
Don't forget to backup your solidity files before doing this.

```
$ truffle run eventgen contracts/fileA.sol contracts/fileB.sol
```
or

```
$ find contracts -name "*.sol" | xargs truffle run eventgen
```

# License
MIT
