const { isArrayTypeNode } = require('typescript');

module.exports = async () => {
  try {
    require('dotenv').config();

    const Web3 = require('web3');
    const web3 = new Web3('https://ropsten.infura.io/v3/' + process.env.INFURA_PROJECT_ID);

    const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');
    const proxyInstance = await AdminUpgradeabilityProxy.deployed();

    const FakeDai = artifacts.require('FakeDai');
    const fakeDaiInstance = await FakeDai.deployed();

    const RealDai = artifacts.require('RealDai');
    const realDaiInstance = await RealDai.deployed();

    let dataCall = web3.eth.abi.encodeFunctionCall(
      {
        name: 'mint',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
          },
        ],
      },
      [process.env.DEV_ADDRESS, '1000000000000000000']
    );

    // let dataCall = web3.eth.abi.encodeFunctionCall(
    //   {
    //     name: 'initialize',
    //     type: 'function',
    //     inputs: [
    //       {
    //         name: 'name',
    //         type: 'string',
    //       },
    //       {
    //         name: 'symbol',
    //         type: 'string',
    //       },
    //       {
    //         name: 'decimals',
    //         type: 'uint8',
    //       },
    //     ],
    //   },
    //   ['Real Dai', 'REALDAI', '18']
    // );

    let result = await proxyInstance.upgradeToAndCall(fakeDaiInstance.address, dataCall);

    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};
