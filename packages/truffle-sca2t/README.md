# truffle-sca2t (Smart Contract Audit Assistant Tool): A set of utilities for auditing Solidity contracts.

#### 

truffle-sca2t is a plugin of [Truffle framework](https://truffleframework.com/docs/truffle/overview). assistant tool for smart contract audit. This provides some utilities to help your smart contract auditing and make your smart contract more secure.

sca2t pronunciation is like skärt.

## Getting Started

Install it via npm:

```console
npm install -g truffle-sca2t
```

## Configuration
Add the following to `truffle.js` in the root directory of your Truffle project:
```javascript
module.exports = {
    plugins: [ "truffle-sca2t" ]
};
```

## Command List
### dependencies

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

### eventgen

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

## License
MIT
