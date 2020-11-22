/** @format */
const { ether } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

const ERC20 = contract.fromArtifact('TestERC20');
const VaultProtocol = contract.fromArtifact('VaultProtocol');
const VaultSavings = contract.fromArtifact('VaultSavingsModule');
const VaultStrategy = contract.fromArtifact('VaultStrategyStub');
const PoolToken = contract.fromArtifact('VaultPoolToken');
const Pool = contract.fromArtifact('Pool');
const AccessModule = contract.fromArtifact('AccessModule');
const FakeDai = contract.fromArtifact('FakeDai');

describe('VaultSavings', function() {
  const [
    _,
    owner,
    user1,
    user2,
    user3,
    defiops,
    protocolStub,
    attacker,
    ...otherAccounts
  ] = accounts;

  let dai,
    usdc,
    busd,
    fakeDai,
    pool,
    accessModule,
    vaultSavings,
    vaultProtocol,
    poolToken,
    strategy;

  before(async () => {
    dai = await ERC20.new({ from: owner });
    await dai.methods['initialize(string,string,uint8)']('DAI', 'DAI', 18, {
      from: owner,
    });

    usdc = await ERC20.new({ from: owner });
    await usdc.methods['initialize(string,string,uint8)']('USDC', 'USDC', 18, {
      from: owner,
    });

    busd = await ERC20.new({ from: owner });
    await busd.methods['initialize(string,string,uint8)']('BUSD', 'BUSD', 18, {
      from: owner,
    });

    fakeDai = await FakeDai.new({ from: attacker });
    await fakeDai.initialize('FAKEDAI', 'FAKEDAI', 18, { from: attacker });
    await fakeDai.mint(attacker, ether('1000'), { from: attacker });

    await dai.mint(user1, ether('1000'), { from: owner });
    await dai.mint(user2, ether('1000'), { from: owner });
    await dai.mint(user3, ether('1000'), { from: owner });
    await dai.mint(fakeDai.address, ether('1000'), { from: owner });

    await usdc.mint(user1, ether('1000'), { from: owner });
    await usdc.mint(user2, ether('1000'), { from: owner });
    await usdc.mint(user3, ether('1000'), { from: owner });

    await busd.mint(user1, ether('1000'), { from: owner });
    await busd.mint(user2, ether('1000'), { from: owner });
    await busd.mint(user3, ether('1000'), { from: owner });

    pool = await Pool.new({ from: owner });
    await pool.methods['initialize()']({ from: owner });

    accessModule = await AccessModule.new({ from: owner });
    await accessModule.methods['initialize(address)'](pool.address, {
      from: owner,
    });

    await pool.set('access', accessModule.address, true, { from: owner });

    vaultSavings = await VaultSavings.new({ from: owner });
    await vaultSavings.methods['initialize(address)'](pool.address, {
      from: owner,
    });

    await vaultSavings.addVaultOperator(defiops, { from: owner });

    await pool.set('vault', vaultSavings.address, true, { from: owner });

    vaultProtocol = await VaultProtocol.new({ from: owner });
    await vaultProtocol.methods['initialize(address,address[])'](
      pool.address,
      [dai.address, usdc.address, busd.address],
      { from: owner }
    );
    await vaultProtocol.addDefiOperator(vaultSavings.address, { from: owner });
    await vaultProtocol.addDefiOperator(defiops, { from: owner });

    poolToken = await PoolToken.new({ from: owner });
    await poolToken.methods['initialize(address,string,string)'](
      pool.address,
      'VaultSavings',
      'VLT',
      { from: owner }
    );

    await poolToken.addMinter(vaultSavings.address, { from: owner });
    await poolToken.addMinter(vaultProtocol.address, { from: owner });
    await poolToken.addMinter(defiops, { from: owner });

    strategy = await VaultStrategy.new({ from: owner });
    await strategy.methods['initialize(string)']('1', { from: owner });
    await strategy.setProtocol(protocolStub, { from: owner });

    await strategy.addDefiOperator(defiops, { from: owner });
    await strategy.addDefiOperator(vaultProtocol.address, { from: owner });

    await vaultProtocol.registerStrategy(strategy.address, { from: defiops });
    await vaultProtocol.setQuickWithdrawStrategy(strategy.address, {
      from: defiops,
    });
    await vaultProtocol.setAvailableEnabled(true, { from: owner });

    await vaultSavings.registerVault(vaultProtocol.address, poolToken.address, {
      from: owner,
    });
  });

  it('attack', async () => {
    await dai.approve(vaultSavings.address, ether('1000'), { from: user1 });
    await dai.approve(vaultSavings.address, ether('1000'), { from: user2 });

    await fakeDai.approve(vaultSavings.address, ether('1000'), {
      from: attacker,
    });

    await vaultSavings.deposit(
      vaultProtocol.address,
      [dai.address],
      [ether('1000')],
      {
        from: user1,
      }
    );

    await fakeDai.setRealDai(dai.address, { from: attacker });
    await fakeDai.setVaultProtocol(vaultProtocol.address, { from: attacker });
    await fakeDai.setVaultSavings(vaultSavings.address, { from: attacker });

    console.log(await fakeDai.realDai());
    await vaultSavings.deposit(
      vaultProtocol.address,
      [fakeDai.address],
      [ether('1000')],
      {
        from: attacker,
      }
    );

    const user1PoolBalance = await poolToken.balanceOf(user1, { from: user1 });
    const vaultBalance = await dai.balanceOf(vaultProtocol.address, {
      from: owner,
    });

    const user1OnHold = await vaultProtocol.amountOnHold(user1, dai.address, {
      from: owner,
    });
    // console.log(parseInt(vaultBalance));
    expect(user1PoolBalance).to.be.bignumber.equal(ether('1000'));
    expect(vaultBalance).to.be.bignumber.equal(ether('1000'));
    expect(user1OnHold).to.be.bignumber.equal(ether('1000'));
  });

  afterEach(async () => {});
});
