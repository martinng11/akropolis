/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 * @format
 */

// const HDWalletProvider = require('truffle-hdwallet-provider');
// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();

require('ts-node/register');
require('dotenv').config();

const { toHex, toWei } = require('web3-utils');

const HDWalletProvider = require('@truffle/hdwallet-provider');
const infuraProjectId = process.env.INFURA_PROJECT_ID;

const mochaGasSettings = {
  reporter: 'eth-gas-reporter',
  reporterOptions: {
    currency: 'USD',
    gasPrice: 21,
  },
};

const mocha = process.env.GAS_REPORTER ? mochaGasSettings : {};

module.exports = {
  contracts_directory: './contracts/test/',

  // plugins: ['truffle-security', 'solidity-coverage', 'truffle-contract-size'],

  // test_file_extension_regexp: /.*\.ts$/,

  networks: {
    // development: {
    //   host: '127.0.0.1',
    //   gas: '6000000',
    //   gasPrice: toHex(toWei('1', 'gwei')),
    //   network_id: '*',
    //   port: '8545',
    //   skipDryRun: true,
    // },
    soliditycoverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555, // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.DEV_PRIVATE_KEY,
          'https://rinkeby.infura.io/v3/' + infuraProjectId
        ),
      network_id: 4, // Rinkeby's id
      gasPrice: 20000000000, // 20 gwei
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          process.env.DEV_PRIVATE_KEY,
          'https://ropsten.infura.io/v3/' + infuraProjectId
        ),
      network_id: 3, // Ropsten 'id
      networkCheckTimeout: false,
      gas: 6721975, //
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          process.env.DEV_PRIVATE_KEY,
          'https://kovan.infura.io/v3/' + infuraProjectId
        ),
      network_id: 42, // Kovan's id
      gasPrice: 20000000000, // 20 gwei
    },
    mainnet: {
      //provider: () => new HDWalletProvider(process.env.DEV_PRIVATE_KEY, "https://cloudflare-eth.com/"),
      provider: () =>
        new HDWalletProvider(
          process.env.DEV_PRIVATE_KEY,
          'https://mainnet.infura.io/v3/' + infuraProjectId
        ),
      network_id: 1, // Mainnet's id
      gasPrice: 45000000000,
    },
  },
  // Set default mocha options here, use special reporters etc.
  mocha,
  // Configure your compilers
  compilers: {
    solc: {
      version: '0.5.17',
      settings: {
        optimizer: {
          enabled: true,
          runs: 10000,
        },
      },
    },
  },
};
