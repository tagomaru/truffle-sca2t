[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
# truffle-sca2t (Smart Contract Audit Assistant Tool): A set of utilities for auditing Solidity contracts.

truffle-sca2t is a plugin of [Truffle framework](https://truffleframework.com/docs/truffle/overview) and an assistant tool for smart contract auditing. It provides some utilities to help your smart contract auditing and make your smart contract more secure and safe. The plugin is compatible with Truffle 5.0 or higher.

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

Install it via [npm](https://docs.npmjs.com/about-npm/):

```
$ npm install truffle-sca2t
```
If you want to install it globally, you need to install it with the [mocha](https://www.npmjs.com/package/mocha) test framework and the report generator [mocha-simple-html-reporter](https://www.npmjs.com/package/mocha-simple-html-reporter).
```
$ npm install -g truffle-sca2t mocha mocha-simple-html-reporter
```

# Configuration
Add `"truffle-sca2t"` to the list of plugins in `truffle-config.js` in the root directory of your Truffle project.  If you don't have any other plugins,
your configuration would get changed to something like:

```javascript
module.exports = {
   plugins: [ "truffle-sca2t" ],
   /* truffle by default adds other stuff here below like... */
   /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   ...
};
```

If you have other plugins already installed, like `my-awesome-plugin` the `plugins` line would look like:

```javascript
    plugins: [ "truffle-sca2t", "my-awsome-plugin" ],
```

# Command List
## 1. mythx

This command can be used in 3 ways.

### Testing for CI
The `mythx` command submits contract code to the [MythX](https://mythx.io/) service. MythX reports back potential vulnerabilities and errors in a MythX log.
After this completes you can check the results using `npm run test:security`.

This two-step process can easily be integrated into your CI since it does not depend on specific CI products such as Circle CI, Travis CI or Jenkins. If you'd like to set up for CircleCI CI testing, see [this](https://github.com/tagomaru/truffle-sca2t-sample/tree/master/.circleci) CircleCI configuration file. Here is a [failure CircleCI run](https://circleci.com/gh/tagomaru/truffle-sca2t-sample/2).

### Testing via Postman
The `mythx` command generates a [Postman](https://www.getpostman.com/) Collection File which can be used in testing.
See [Postman Support](#1-2-postman-support) for more information.

### MythX Results via the Command Line
If you just want to use this as a MythX client tool, you can use the command line interface mode.
See [Command Line Interface Mode](#1-3-command-line-interface-mode) for more information.

### Get prior MythX results

See [Command Line Interface Mode](#1-1-5-get-an-analysis-result-from-a-previous-run).

### 1-1. Generate Test Code File for Mocha testing

To run the examples in this section, do the following first:

```
$ git clone git@github.com:tagomaru/truffle-sca2t-sample.git
Cloning into 'truffle-sca2t-sample'...
...
Resolving deltas: 100% (1/1), done.
$ cd truffle-sca2t-sample
```

#### 1-1-1. MythX Account
You can set up an account on the [MythX website](https://mythx.io) to get full access.

After setting up an account, set the following environment variables to your ETH address and password (add this to your `.bashrc` or `.bash_profile` for added convenience):
```bash
export MYTHX_ETH_ADDRESS=0x1234567891235678900000000000000000000000
export MYTHX_PASSWORD='Put your password in here!'
```

#### 1-1-2. Generate Test Code Files


```console
$ truffle run mythx A.sol
```
or you can give multiple contracts:
```console
$ truffle run mythx A.sol C.sol
```
The below is the same as the above but with explicit paths. Use the "tab" key for autocompletion.
```console
$ truffle run mythx contracts/A.sol contracts/C.sol
```

Although you can list multiple contracts, the plugin `mythx` command will automatically include files that have dependencies. For example,

`A.sol`:
```solidity
pragma solidity ^0.5.0;
import "./C.sol";
contract A is C {}
contract B {}
```

`C.sol`:
```solidity
pragma solidity ^0.5.0;
contract C {
  uint public a;
  function add(uint b) public {
    a = a + b;
  }
}
```

The command `truffle run mythx A.sol` generates test code file `test_A.sol_.js`; in doing so it sees that `A.sol` imports `C.sol`.
The test code file then sends AST and source code for not only `A` but also `C` to MythX API at the same time. You can see the data sent [here](https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/data1.json).

Therefore in the command-line invocations given above the first command `truffle run mythx A.sol` is equivalent to the two other examples below it.

#### 1-1-3. Configuration For Your CI
This command automatically generates sca2t configuration file,`sca2t-config.js`, in your project root if there is none already. In that nodejs file, you can customize the report format, add SWCs that MythX should not report, and so on.

#### 1-1-4. Run The Test Code Files
After test code files are successfully generated from the `mythx` command, you can then run mocha test this way:

```console
$ npm run test:security
```

If you want a beautiful HTML report (recommended), execute the below command.

```console
$ npm run test:security:html
```

`security-report.html` is generated on your project root. The report file of `A` looks like this - as you can see, the file reports the vulnerability of `C`:

<img src="https://raw.githubusercontent.com/tagomaru/static-for-github/master/truffle-sca2t/truffle-sca2t-mythx/sample-report1.jpg">

And you can see the report [here](http://htmlpreview.github.io/?https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/security-report1.html).

#### 1-1-5. Get an analysis result from a previous run

Sometimes MythX takes a long time to analyze contracts, or you might like to see a report for a job that was submitted in the past.
When you submit a MythX job you should get a UUID back. With this UUID you can get a report like this:

```console
$ truffle run mythx --uuid='your UUID'
```

### 1-2. Postman Support

[Postman](https://www.getpostman.com/) is a tool for working with MythX at the API level. You can  set HTTP headers, see HTTP responses for HTTP `GET`s, and `POST`s and so on. This is great for seeing what goes over the network at the HTTP level. You can also use this for testing instead of using `mocha`.


#### 1-2-1. Generate a Postman Collection File

Use the `--postman` option to create a [Postman Collection](https://learning.getpostman.com/docs/postman/collections/intro_to_collections/) which can be used in testing to see that no contracts have vulnerabilities.

For example:

```console
$ truffle run mythx contracts/A.sol --postman
Generating Postman collection file:... done.
Please import ./pm-collection-mythx.json in Postman
Also, you should set an ethAddress and password in Postman environment variables.
```

As before, you can create a Postman collection with multiple Solidity contracts:
```console
$ truffle run mythx contracts/A.sol contracts/C.sol --postman
```

As before, if `C.sol` is imported by `A.sol` then it need not be listed explicitly.


#### 1-2-2. Import Postman Collection File in Postman
Import the generated file in Postman.  You need to set `ethAddress` and
`password` to the values in your MythX account as Postman environment variables.

Currently, this supports the below requests.
1. login
2. submit analysis
3. get status
4. get issues

### 1-3. Command Line Interface Mode
If you do not want test a code file and just want the results, add the `--cli` option.
```
$ truffle run mythx A.sol --cli
```
The`--markdown` option gives the results in markdown format.
```
$ truffle run mythx A.sol --cli --markdown
```

* **report image**
<img src="https://raw.githubusercontent.com/tagomaru/static-for-github/master/truffle-sca2t/truffle-sca2t-mythx/sample-report-md1.jpg">

The sample is [here](https://github.com/tagomaru/static-for-github/blob/master/truffle-sca2t/truffle-sca2t-mythx/security-report.md)
(the `emoji` is optional).

### 1-4. Advanced Options
Run `truffle run mythx --help` to show advanced configuration options.
```console
$ truffle run mythx --help
Usage: truffle run mythx [*file-name1* [*file-name2*] ...]
  e.g.: truffle run mythx contracts/A.sol contracts/sub/C.sol

Options:
  --help      print help.
  --uuid      get analysis report with UUID.
  --postman   generate Postman collection file.
  --cli       analyze in cli mode.
  --markdown  generate markdown format report in cli mode.
  --emoji     insert emoji in markdown format report. (Only support GitHub Flavored Markdown)
```

## 2. dependencies

The `dependencies` command outputs a diagram in HTML to visualize dependencies among contracts. Boxes shown in the report are draggable to allow you to reorganize the display as you like. Information such as contracts, functions, dependencies of inheritance, declarations, and user-definded types are shown. Contracts and functions in EthPM and NPM packages are included in searching for information.

```
$ truffle run dependencies A.sol
```

or as before with several contracts:

```
$ truffle run dependencies A.sol C.sol
```

<img src="https://raw.githubusercontent.com/wiki/tagomaru/sca2t/images/dependencies.png" height="236">

## 3. eventgen

The `eventgen` can help you track contract and function calls. It changes the Solidity contract file(s). Specifically it wraps tracing instrumentation around functions and contracts, after first prompting if you would like a backup of the Solidity files to be changed. View functions are not wrapped.

```console
$ truffle run eventgen contracts/A.sol contracts/C.sol
```
or to run `eventgen` over all Solidity files:

```console
$ find contracts -name "*.sol" | xargs truffle run eventgen
```

# License
MIT
