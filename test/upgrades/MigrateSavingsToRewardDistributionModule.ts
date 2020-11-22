import { 
    PoolContract, PoolInstance, 
    AccessModuleContract, AccessModuleInstance,
    SavingsModuleContract, SavingsModuleInstance,
    SavingsModuleOldContract,SavingsModuleOldInstance,
    RewardDistributionModuleContract,RewardDistributionModuleInstance,
    RewardVestingModuleContract, RewardVestingModuleInstance,
    CompoundProtocolContract,CompoundProtocolInstance,
    PoolTokenContract,PoolTokenInstance,
    PoolTokenOldContract,PoolTokenOldInstance,
    StakingPoolContract,StakingPoolInstance,
    StakingPoolAdelContract,StakingPoolAdelInstance,
    FreeErc20Contract,FreeErc20Instance,
    CErc20StubContract,CErc20StubInstance,
    ComptrollerStubContract,ComptrollerStubInstance
} from "../../types/truffle-contracts/index";


const { BN, constants, expectEvent, shouldFail, time } = require("@openzeppelin/test-helpers");

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const UPGRADABLE_OPTS = {
    unsafeAllowCustomTypes: true
};

import Snapshot from "../utils/snapshot";
const should = require("chai").should();
var expect = require("chai").expect;
const expectRevert= require("../utils/expectRevert");
const expectEqualBN = require("../utils/expectEqualBN");
const w3random = require("../utils/w3random");

const FreeERC20 = artifacts.require("FreeERC20");
const CErc20Stub = artifacts.require("CErc20Stub");
const ComptrollerStub = artifacts.require("ComptrollerStub");

const Pool = artifacts.require("Pool");
const AccessModule = artifacts.require("AccessModule");
const SavingsModule = artifacts.require("SavingsModule");
const SavingsModuleOld = artifacts.require("SavingsModuleOld");
const RewardVestingModule = artifacts.require("RewardVestingModule");
const RewardDistributionModule = artifacts.require("RewardDistributionModule");
const CompoundProtocol = artifacts.require("CompoundProtocol");
const PoolToken = artifacts.require("PoolToken");
const PoolTokenOld = artifacts.require("PoolTokenOld");

const StakingPool  =  artifacts.require("StakingPool");
const StakingPoolADEL  =  artifacts.require("StakingPoolADEL");

contract("Upgrades: migrate rewards from Savings to RewardDistribution", async ([owner, user, ...otherAccounts]) => {
    //let snap:Snapshot;

    let dai:FreeErc20Instance;
    let cDai:CErc20StubInstance;
    let comp:FreeErc20Instance;
    let comptroller:ComptrollerStubInstance;


    let pool:PoolInstance;
    let access:AccessModuleInstance;
    let savings:SavingsModuleOldInstance|SavingsModuleInstance;
    let rewardDistributions:RewardDistributionModuleInstance;
    let rewardVesting:RewardVestingModuleInstance;
    let compoundProtocolDai:CompoundProtocolInstance;
    let poolTokenCompoundProtocolDai:PoolTokenOldInstance|PoolTokenInstance;    
    let akro:FreeErc20Instance;
    let adel:FreeErc20Instance;
    let stakingPoolAkro:StakingPoolInstance;
    let stakingPoolAdel:StakingPoolAdelInstance;


    before(async () => {
        //Setup external contracts
        dai = await deployProxy(FreeERC20, ["Dai Stablecoin", "DAI"], UPGRADABLE_OPTS);
        cDai = await deployProxy(CErc20Stub, [dai.address], UPGRADABLE_OPTS);
        comp = await deployProxy(FreeERC20, ["Compound", "COMP"], UPGRADABLE_OPTS);
        comptroller = await deployProxy(ComptrollerStub, [comp.address], UPGRADABLE_OPTS);
        await comptroller.setSupportedCTokens([cDai.address]);
        await comp.methods['mint(address,uint256)'](comptroller.address, web3.utils.toWei('1000000000'));

        //Setup system contracts
        pool = await deployProxy(Pool, [], UPGRADABLE_OPTS);

        access = await deployProxy(AccessModule, [pool.address], UPGRADABLE_OPTS);
        await pool.set('access', access.address, false);

        savings = await deployProxy(SavingsModuleOld, [pool.address], UPGRADABLE_OPTS);
        await pool.set('savings', savings.address, false);

        akro = await deployProxy(FreeERC20, ["Akropolis", "AKRO"], UPGRADABLE_OPTS);
        await pool.set('akro', akro.address, false);
        adel = await deployProxy(FreeERC20, ["Akropolis Delphi", "ADEL"], UPGRADABLE_OPTS);
        await pool.set('adel', adel.address, false);

        stakingPoolAkro = await deployProxy(StakingPool, [pool.address, akro.address, '0'], UPGRADABLE_OPTS);
        await pool.set('staking', stakingPoolAkro.address, false);
        stakingPoolAdel = await deployProxy(StakingPoolADEL, [pool.address, adel.address, '0'], UPGRADABLE_OPTS);
        await pool.set('stakingAdel', stakingPoolAdel.address, false);

        compoundProtocolDai = await deployProxy(CompoundProtocol, [pool.address, dai.address, cDai.address, comptroller.address], UPGRADABLE_OPTS);
        poolTokenCompoundProtocolDai = await deployProxy(PoolTokenOld, [pool.address, "Delphi Compound DAI","dCDAI"], UPGRADABLE_OPTS);
        await savings.registerProtocol(compoundProtocolDai.address, poolTokenCompoundProtocolDai.address);
        await compoundProtocolDai.addDefiOperator(savings.address);
        await poolTokenCompoundProtocolDai.addMinter(savings.address);

        rewardVesting = await deployProxy(RewardVestingModule, [pool.address], UPGRADABLE_OPTS);
        await pool.set('reward', rewardVesting.address, false);

        rewardDistributions = await deployProxy(RewardDistributionModule, [pool.address], UPGRADABLE_OPTS);
        await pool.set('rewardDistributions', rewardDistributions.address, false);
        await rewardDistributions.registerProtocol(compoundProtocolDai.address, poolTokenCompoundProtocolDai.address);
        await compoundProtocolDai.addDefiOperator(rewardDistributions.address);

        //Save snapshot
        //snap = await Snapshot.create(web3.currentProvider);
    });

    beforeEach(async () => {
        //await snap.revert();
    });

    it('should deposit', async () => {
        let amount = web3.utils.toWei('1000');
        await dai.methods['mint(address,uint256)'](user, amount);
        await dai.approve(savings.address, amount, {from:user});
        await savings.methods['deposit(address,address[],uint256[])'](compoundProtocolDai.address, [dai.address], [amount], {from:user});

        let lpAmount = await poolTokenCompoundProtocolDai.balanceOf(user);
        expect(lpAmount).to.be.bignumber.gt('0');
    });

    it('should receive rewards', async () => {
        await (<SavingsModuleOldInstance>savings).distributeRewards(); //First request is required to register in ComptrollerStub

        await time.increase(7*24*60*60);
        //await (<SavingsModuleOldInstance>savings).distributeRewards();
        await (<SavingsModuleOldInstance>savings).distributeRewardsForced(compoundProtocolDai.address);

        let protocolCompBalance = await comp.balanceOf(compoundProtocolDai.address);
        expect(protocolCompBalance).to.be.bignumber.gt('0'); 
        //console.log('protocolCompBalance', protocolCompBalance, web3.utils.fromWei(protocolCompBalance));

        let userReward = await (<any> savings).methods['rewardBalanceOf(address,address,address)'](user, poolTokenCompoundProtocolDai.address, comp.address);
        expect(userReward).to.be.bignumber.gt('0'); 
    });

    it('should upgrade savings', async () => {
        savings = await upgradeProxy(savings.address, SavingsModule, UPGRADABLE_OPTS);
        poolTokenCompoundProtocolDai = await upgradeProxy(poolTokenCompoundProtocolDai.address, PoolToken, UPGRADABLE_OPTS);
    });        

    it('should still have rewards', async () => {
        let userReward = await rewardDistributions.methods['rewardBalanceOf(address,address,address)'](user, poolTokenCompoundProtocolDai.address, comp.address);
        expect(userReward).to.be.bignumber.gt('0'); 
    });

    it('should withdraw rewards after centralized upgrade', async () => {
        let snap = await Snapshot.create(web3.currentProvider);

        await rewardDistributions.migrateRewards([user]);

        await rewardDistributions.methods['withdrawReward()']({from:user});
        let userReward = await comp.balanceOf(user);
        expect(userReward).to.be.bignumber.gt('0'); 

        await snap.revert();
    });


    it('should withdraw rewards without centralized upgrade', async () => {
        await rewardDistributions.methods['withdrawReward()']({from:user});
        let userReward = await comp.balanceOf(user);
        expect(userReward).to.be.bignumber.gt('0'); 
    });

});
