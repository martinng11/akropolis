require('dotenv').config();

const FakeDai = artifacts.require('FakeDai');
const RealDai = artifacts.require('RealDai');

const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');
const Web3 = require('web3');
const web3 = new Web3('https://ropsten.infura.io/v3/' + process.env.INFURA_PROJECT_ID);

module.exports = async function(deployer) {
  try {
    let fakeDaiInstance = await deployer.deploy(FakeDai);

    let realDaiInstane = await deployer.deploy(RealDai);

    let data = web3.eth.abi.encodeFunctionCall(
      {
        name: 'initialize',
        type: 'function',
        inputs: [
          {
            type: 'string',
            name: 'name',
          },
          {
            type: 'string',
            name: 'symbol',
          },
          {
            type: 'uint8',
            name: 'decimals',
          },
        ],
      },
      ['Fake Dai', 'FAKEDAI', '18']
    );

    let adminProxy = await deployer.deploy(
      AdminUpgradeabilityProxy,
      FakeDai.address,
      process.env.DEV_ADDRESS,
      data
    );
  } catch (error) {
    console.log(error);
  }
  return;
};
