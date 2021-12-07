"use strict";
const { BN, expectRevert, expectEvent, time } = require('@openzeppelin/test-helpers');
let BigNumber = require("bignumber.js");

var  TokenStake = artifacts.require("./SDAOBondedTokenStake.sol");

let Contract = require("@truffle/contract");
let TokenAbi = require("singularitydao-token-contracts/abi/SDAOToken.json");
let TokenNetworks = require("singularitydao-token-contracts/networks/SDAOToken.json");
let TokenBytecode = require("singularitydao-token-contracts/bytecode/SDAOToken.json");
let Token = Contract({contractName: "SingularityDAOToken", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});
Token.setProvider(web3.currentProvider);

const MockERC20 = artifacts.require('ERC20Mock');

var ethereumjsabi  = require('ethereumjs-abi');
var ethereumjsutil = require('ethereumjs-util');
const { assert } = require("chai");

async function testErrorRevert(prom)
{
    let rezE = -1
    try { await prom }
    catch(e) {
        rezE = e.message.indexOf('revert');
        //console.log("Catch Block: " + e.message);
    }
    assert(rezE >= 0, "Must generate error and error message must contain revert");
}


const decimals = 18;
const decimalFactor = (new BigNumber(10)).pow(decimals); 

contract('TokenStake', function(accounts) {

console.log("Number of Accounts - ", accounts.length)

    var tokenStake;
    var tokenAddress;
    var token;
    var bonusToken;
    
    let GAmt = (new BigNumber(10000)).times(decimalFactor).toFixed(); //10000  * 100000000;
    let Amt1 = (new BigNumber(10)).times(decimalFactor).toFixed(); //10  * 100000000;
    let Amt2 = (new BigNumber(20)).times(decimalFactor).toFixed(); //20  * 100000000;
    let Amt3 = (new BigNumber(30)).times(decimalFactor).toFixed(); //30 * 100000000;
    let Amt4 = (new BigNumber(40)).times(decimalFactor).toFixed(); //40 * 100000000;
    let Amt5 = (new BigNumber(50)).times(decimalFactor).toFixed(); //50 * 100000000;
    let Amt6 = (new BigNumber(60)).times(decimalFactor).toFixed(); //60 * 100000000;
    let Amt7 = (new BigNumber(70)).times(decimalFactor).toFixed(); //70 * 100000000;

    before(async () => 
        {
            tokenStake = await TokenStake.deployed();
            tokenAddress = await tokenStake.token.call();
            token = await Token.at(tokenAddress);

            //console.log("Current Block number - ", (await web3.eth.getBlockNumber()));
            //console.log("maxMigrationBlocks - ", (await tokenStake.maxMigrationBlocks.call()).toNumber());

            // Create the instance of the bonus token
            bonusToken = await MockERC20.new('xSDAO', 'xSDAO', GAmt, { from: accounts[0] });

        });

        const approveTokensToContract = async(_startAccountIndex, _endAccountIndex, _depositAmt) => {
            // Transfer & Approve amount for respective accounts to Contract Address
            for(var i=_startAccountIndex;i<=_endAccountIndex;i++) {
                await token.transfer(accounts[i],  _depositAmt, {from:accounts[0]});
                await token.approve(tokenStake.address,_depositAmt, {from:accounts[i]});
            }

        };

        const updateOwnerAndVerify = async(_newOwner, _account) => {

            let newOwner = "0x0"

            const owner_b = await tokenStake.owner.call();
            await tokenStake.transferOwnership(_newOwner, {from:_account});

            newOwner = await tokenStake.owner.call();

            assert.equal(newOwner, _newOwner);

        }

        const updateTokenOperatorAndVeryfy = async(_tokenOperator, _account) => {

            await tokenStake.updateOperator(_tokenOperator, {from:_account});

            // Get the Updated Token Operator
            const tokenOperator = await tokenStake.tokenOperator.call();
            assert.equal(tokenOperator, _tokenOperator);

        }
        

        const openStakeAndVerify = async(_startPeriod, _endSubmission, _endPeriod, _rewardAmount, _maxStake, _windowMaxAmount, _account) => {
        
            const currentStakeMapIndex_b = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const windowTotalStake_b = (await tokenStake.windowTotalStake.call());

            // Open Stake for a Given Period
            await tokenStake.openForStake(_startPeriod, _endSubmission, _endPeriod, _rewardAmount, _maxStake, _windowMaxAmount, {from:_account});

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call("0x0000000000000000000000000000000000000000");

            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = (await tokenStake.windowTotalStake.call());

            // Test the Stake Map Index
            assert.equal(currentStakeMapIndex, currentStakeMapIndex_b + 1);

            // Test the Staking Period Configurations
            assert.equal(startPeriod_a.toNumber(), _startPeriod);
            assert.equal(submissionEndPeriod_a.toNumber(), _endSubmission);
            assert.equal(endPeriod_a.toNumber(), _endPeriod);

            assert.equal((new BigNumber(maxStake_a)).toFixed(), _maxStake);
            assert.equal((new BigNumber(windowTotalStake_a)).toFixed(), (new BigNumber(windowTotalStake_b)).plus(_rewardAmount).toFixed());
            assert.equal((new BigNumber(windowRewardAmount_a)).toFixed(), _rewardAmount);
            assert.equal((new BigNumber(windowMaxAmount_a)).toFixed(), _windowMaxAmount);

        }

        const submitStakeAndVerify = async(_stakeAmount, _account) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const wallet_bal_b = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_b = new BigNumber(await tokenStake.balances(_account)).toFixed();

            const {found: found_b, amount: amount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);            

            const windowTotalStake_b = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // Submit the Stake
            await tokenStake.submitStake( _stakeAmount, {from:_account});

            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            const wallet_bal_a = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_a = new BigNumber(await tokenStake.balances(_account)).toFixed();

            assert.equal(rewardComputeIndex_a.toNumber(), rewardComputeIndex_b.toNumber());


            // Stake Amount Should Increase
            assert.equal((new BigNumber(amount_a)).toFixed(), (new BigNumber(amount_b)).plus(_stakeAmount).toFixed());

            // Wallet balance should reduce
            assert.equal(wallet_bal_a, (new BigNumber(wallet_bal_b)).minus(_stakeAmount).toFixed());

            // Contract balance should increase
            assert.equal(contract_bal_a, (new BigNumber(contract_bal_b)).plus(_stakeAmount).toFixed());

            // Account balance in the contract should increase
            assert.equal(contract_account_bal_a, (new BigNumber(contract_account_bal_b)).plus(_stakeAmount).toFixed());

            // Should be increased by the amount of new stake submission
            assert.equal(windowTotalStake_a, (new BigNumber(windowTotalStake_b)).plus(_stakeAmount).toFixed());
        }

        const submitStakeForAndVerify = async(_stakeForAccount, _stakeAmount, _account) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const wallet_bal_b = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_b = new BigNumber(await tokenStake.balances(_stakeForAccount)).toFixed();
            const contract_account_executer_bal_b = new BigNumber(await tokenStake.balances(_account)).toFixed();

            const {found: found_b, amount: amount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_stakeForAccount);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);            

            const windowTotalStake_b = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // Submit the Stake
            await tokenStake.submitStakeFor(_stakeForAccount, _stakeAmount, {from:_account});

            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_stakeForAccount);

            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            const wallet_bal_a = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_a = new BigNumber(await tokenStake.balances(_stakeForAccount)).toFixed();
            const contract_account_executer_bal_a = new BigNumber(await tokenStake.balances(_account)).toFixed();

            assert.equal(rewardComputeIndex_a.toNumber(), rewardComputeIndex_b.toNumber());


            // Stake Amount Should Increase
            assert.equal((new BigNumber(amount_a)).toFixed(), (new BigNumber(amount_b)).plus(_stakeAmount).toFixed());

            // Wallet balance should reduce
            assert.equal(wallet_bal_a, (new BigNumber(wallet_bal_b)).minus(_stakeAmount).toFixed());

            // Contract balance should increase
            assert.equal(contract_bal_a, (new BigNumber(contract_bal_b)).plus(_stakeAmount).toFixed());

            // Account balance in the contract should increase
            assert.equal(contract_account_bal_a, (new BigNumber(contract_account_bal_b)).plus(_stakeAmount).toFixed());

            // Account balance in the contract for executer should not change
            assert.equal(contract_account_executer_bal_b, contract_account_executer_bal_a);

            // Should be increased by the amount of new stake submission
            assert.equal(windowTotalStake_a, (new BigNumber(windowTotalStake_b)).plus(_stakeAmount).toFixed());
        }




        const claimStakeAndVerify = async (_stakeMapIndex, _account) => {

            // Token Balance
            const wallet_bal_b = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();
            const wallet_bonusToken_bal_b = new BigNumber(await bonusToken.balanceOf(_account)).toFixed();

            // Contract Stake Balance
            const contract_account_bal_b = new BigNumber(await tokenStake.balances(_account)).toFixed();

            const {found: found_b, amount: amount_b, rewardComputeIndex: rewardComputeIndex_b, bonusAmount: bonusAmount_b}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(_stakeMapIndex); 

            const windowTotalStake_b = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // Call Withdraw Stake
            //await tokenStake.claimStake(_stakeMapIndex, {from:_account});
            await tokenStake.claimStake({from:_account});

            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a, bonusAmount: bonusAmount_a}
            = await tokenStake.getStakeInfo.call(_account);

            const windowTotalStake_a = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // Token Balance
            const wallet_bal_a = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();
            const wallet_bonusToken_bal_a = new BigNumber(await bonusToken.balanceOf(_account)).toFixed();

            // Contract Stake Balance
            const contract_account_bal_a = new BigNumber(await tokenStake.balances(_account)).toFixed();

            let claimAmount = 0;
            claimAmount = amount_b;

            // Wallet Balance should increase
            assert.equal(wallet_bal_b, (new BigNumber(wallet_bal_a)).minus(claimAmount).toFixed());

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, (new BigNumber(contract_bal_a)).plus(claimAmount).toFixed());

            // Account Balance, Total Stake & Total Approved Stake in the contract should reduce
            assert.equal(contract_account_bal_b, (new BigNumber(contract_account_bal_a)).plus(claimAmount).toFixed());

            // Window total amount should reduce
            assert.equal(windowTotalStake_a, (new BigNumber(windowTotalStake_b)).minus(claimAmount).toFixed());

            // Stake amount should be reset
            assert.equal((new BigNumber(amount_a)).toFixed(), 0);

            // Bonus token balance should be zero
            assert.equal((new BigNumber(bonusAmount_a)).toFixed(), 0);
            
            // Wallet balance for the bonus token should increase
            assert.equal(wallet_bonusToken_bal_a, (new BigNumber(wallet_bonusToken_bal_b)).plus(bonusAmount_b).toFixed())

        }

        const withdrawTokenAndVerify = async(_amount, _account) => {

            // Token Balance
            const wallet_bal_b = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            // Call Withdraw Stake
            await tokenStake.withdrawToken(_amount, {from:_account});

            // Token Balance
            const wallet_bal_a = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            // Wallet Balance Should Increase
            assert.equal(wallet_bal_b, (new BigNumber(wallet_bal_a)).minus(_amount).toFixed());

            // Contract Balance Should Reduce
            assert.equal(contract_bal_b, (new BigNumber(contract_bal_a)).plus(_amount).toFixed());

        }

        const depositTokenAndVerify = async(_amount, _account) => {

            // Token Balance
            const wallet_bal_b = (await token.balanceOf(_account));
            const contract_bal_b = (await token.balanceOf(tokenStake.address));

            // Call Withdraw Stake
            // await tokenStake.depositToken(_amount, {from:_account});
            await token.transfer(tokenStake.address,  _amount, {from:_account});

            // Token Balance
            const wallet_bal_a = (await token.balanceOf(_account));
            const contract_bal_a = (await token.balanceOf(tokenStake.address));

            // Wallet Balance Should reduce
            assert.equal((new BigNumber(wallet_bal_b)).toFixed(), (new BigNumber(wallet_bal_a)).plus(_amount).toFixed());

            // Contract Balance Should Increase
            assert.equal((new BigNumber(contract_bal_b)).toFixed(), (new BigNumber(contract_bal_a)).minus(_amount).toFixed());
            
        }

        const computeAndAddRewardAndVerify = async (existingStakeMapIndex, _staker, bonusAmount, _account) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const wallet_bal_b = new BigNumber(await token.balanceOf(_staker)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_b = new BigNumber(await tokenStake.balances(_staker)).toFixed();

            const {found: found_b, amount: amount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_staker);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_b = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // auto renew the Stake
            await tokenStake.computeAndAddReward(existingStakeMapIndex, _staker, bonusAmount, {from:_account});

            // Current Stake
            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_staker);

            // Staking Window
            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            const wallet_bal_a = new BigNumber(await token.balanceOf(_staker)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

            const contract_account_bal_a = new BigNumber(await tokenStake.balances(_staker)).toFixed();

            // Calculate the Reward
            //const rewardAmount = Math.floor( amount_b.toNumber() * windowRewardAmount_b.toNumber() / (windowTotalStake_b - windowRewardAmount_b.toNumber()));
            const rewardAmount = (new BigNumber(amount_b)).times(windowRewardAmount_b).div((new BigNumber(windowTotalStake_b)).minus(windowRewardAmount_b)).integerValue(BigNumber.ROUND_FLOOR);

            const newStakeAmount = (new BigNumber(amount_b)).plus(rewardAmount).toFixed();
            const returnAmount = 0;//newStakeAmount -  _amount;    // There will be any return as full amount is Auto Renewed

            // Wallet should balance should increase
            assert.equal(wallet_bal_b, (new BigNumber(wallet_bal_a)).minus(returnAmount).toFixed());

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, (new BigNumber(contract_bal_a)).plus(returnAmount).toFixed());

            // Approved Amount should be increased
            assert.equal((new BigNumber(amount_a)).toFixed(), (new BigNumber(amount_b)).plus(rewardAmount).toFixed());

            // Staking Period Window Total Stake should not change
            assert.equal(windowTotalStake_a, windowTotalStake_b);

            // Account balance in the contract should reduce if approved amount < new staked amount
            assert.equal(contract_account_bal_a, (new BigNumber(contract_account_bal_b)).plus(rewardAmount).minus(returnAmount).toFixed());

            // Check for the reward computed index
            assert.equal(rewardComputeIndex_a.toNumber(), existingStakeMapIndex)

        }

        const withdrawStakeAndVerify = async (existingStakeMapIndex, _stakeAmount, _account) => {

            const wallet_bal_b = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_b = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();
            const wallet_bonusToken_bal_b = new BigNumber(await bonusToken.balanceOf(_account)).toFixed();

            const contract_account_bal_b = new BigNumber(await tokenStake.balances(_account)).toFixed();
            
            const {found: found_b, amount: amount_b, rewardComputeIndex: rewardComputeIndex_b, bonusAmount: bonusAmount_b}
            = await tokenStake.getStakeInfo.call(_account);
            
            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(existingStakeMapIndex);            
            
            // Withdraw the Stake
            //await tokenStake.withdrawStake(existingStakeMapIndex, _stakeAmount, {from:_account});
            await tokenStake.withdrawStake(_stakeAmount, {from:_account});
            
            const {found: found_a, amount: amount_a, rewardComputeIndex: rewardComputeIndex_a, bonusAmount: bonusAmount_a}
            = await tokenStake.getStakeInfo.call(_account);
            
            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(existingStakeMapIndex);
            
            const wallet_bal_a = new BigNumber(await token.balanceOf(_account)).toFixed();
            const contract_bal_a = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();
            const wallet_bonusToken_bal_a = new BigNumber(await bonusToken.balanceOf(_account)).toFixed();

            const contract_account_bal_a = new BigNumber(await tokenStake.balances(_account)).toFixed();

            // Stake Amount Should Reduce
            assert.equal((new BigNumber(amount_a)).toFixed(), (new BigNumber(amount_b)).minus(_stakeAmount).toFixed());

            // Token Balance in the wallet should increase
            assert.equal(wallet_bal_a, (new BigNumber(wallet_bal_b)).plus(_stakeAmount).toFixed());

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, (new BigNumber(contract_bal_a)).plus(_stakeAmount).toFixed());

            // Token Balance in the contract should reduce
            assert.equal(contract_account_bal_a, (new BigNumber(contract_account_bal_b)).minus(_stakeAmount).toFixed());

            // Bonus token balance should be zero
            assert.equal((new BigNumber(bonusAmount_a)).toFixed(), 0);

            // Wallet balance for the bonus token should increase
            assert.equal(wallet_bonusToken_bal_a, (new BigNumber(wallet_bonusToken_bal_b)).plus(bonusAmount_b).toFixed())

        }

        const waitTimeInSlot = async(slot) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const currentTimeStamp = Math.round(Date.now() / 1000);

            var waitTimeInSec = 0;

            switch(slot) {
                case "OPEN_FOR_SUBMISSION":
                    waitTimeInSec = startPeriod_b.toNumber() - currentTimeStamp;
                    break;
                case "OPEN_FOR_INCUBATION":
                    waitTimeInSec = submissionEndPeriod_b.toNumber() - currentTimeStamp;
                    break;
                case "END_STAKE":
                    waitTimeInSec = endPeriod_b.toNumber() - currentTimeStamp;
                    break;
                default:
                    break;
            }

            return waitTimeInSec>0?waitTimeInSec+3:0;
            
        }

        const getRandomNumber = (max) => {
            const min = 10; // To avoid zero rand number
            return Math.floor(Math.random() * (max - min) + min);
        }

        const sleep = async (sec) => {
            console.log("Waiting for cycle to complete...Secs - " + sec);
            return new Promise((resolve) => {
                setTimeout(resolve, sec * 1000);
              });
        }

        const displayCurrentStateOfContract = async () => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();
    
            console.log("##############################Start of Display###################################")

            for(var s=1; s<=currentStakeMapIndex; s++) {
    
                console.log("****************Current State of the Contract - ", s," **************************")
    
                for(var i=0;i<10;i++) {
    
                    const stakeData = await tokenStake.getStakeInfo.call(accounts[i]);
    
                    if(stakeData.found) {
                        console.log("--------------------------- ",accounts[i]," -------------------------------------")
                        console.log("Staker - ", accounts[i]);
                        console.log("found - ", stakeData.found);
                        console.log("amount - ", stakeData.amount.toNumber());
                        console.log("rewardComputeIndex - ", stakeData.rewardComputeIndex.toNumber());
                        console.log("balance - ", new BigNumber(await tokenStake.balances(accounts[i])).toFixed());
    
                        console.log("----------------------------------------------------------------")
                    }
                }
    
                console.log("*******************************Current State of the Contract*************************************")
            }

            console.log("Window Total Stake - ", new BigNumber(await tokenStake.windowTotalStake.call()).toFixed());
            console.log("Contract Balance - ", new BigNumber(await token.balanceOf(tokenStake.address)).toFixed());

            console.log("##############################End of Display##############################")

        }


        // Migrate multiple stakers from previous window
        const airDropStakesAndVerify = async(existingStakeMapIndex, _stakers,_stakeAmounts, _account) => {


            const windowTotalStake_b = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // Add Air Drop Stakes 
            await tokenStake.airDropStakes(existingStakeMapIndex, _stakers, _stakeAmounts, {from:_account});            


            const windowTotalStake_a = new BigNumber(await tokenStake.windowTotalStake.call()).toFixed();

            // All the stakers balance to be same as air dropped stakeAmount
            let stakersBalInContract = [];
            let totalStakeMigrated = new BigNumber(0);
            for(var i=0; i<_stakers.length;i++) {
                const bal = new BigNumber(await tokenStake.balances(_stakers[i])).toFixed();
                stakersBalInContract.push(bal);

                totalStakeMigrated = totalStakeMigrated.plus(bal);
            }
            assert.deepStrictEqual(_stakeAmounts, stakersBalInContract);

            // Window Total Stake Amount should be with the total amount air dropped stake
            assert.equal(windowTotalStake_a, totalStakeMigrated.plus(windowTotalStake_b).toFixed());

        }




    // ************************ Test Scenarios Starts From Here ********************************************

    it("0. Initial Account Setup - Transfer & Approve Tokens", async function() 
    {
        // accounts[0] -> Contract Owner
        // accounts[1] to accounts[8] -> Token Stakers
        // accounts[9] -> Token Operator

        // An explicit call is required to mint the tokens for SDAO
        const initMint = (new BigNumber(GAmt).times(1000).toFixed())
        await token.mint(accounts[0], initMint, {from:accounts[0]});

        await approveTokensToContract(1, 9, GAmt);

        // Transfer bonus tokens to the Staking contract
        await bonusToken.transfer(tokenStake.address,  GAmt, {from:accounts[0]});

        // Set the bonus Token - By Non owner should fail
        await testErrorRevert(tokenStake.setBonusToken(bonusToken.address, {from:accounts[2]}));
        // Set the bonus Token - By owner
        await tokenStake.setBonusToken(bonusToken.address, {from:accounts[0]});

    });

    it("1. Administrative Operations - Update Owner", async function() 
    {

        // Change the Owner to Accounts[1]
        await updateOwnerAndVerify(accounts[1], accounts[0]);
        // Revert to back the ownership to accounts[0]
        await updateOwnerAndVerify(accounts[0], accounts[1]);

        // Owner Cannot be updated by any other user
        await testErrorRevert(tokenStake.transferOwnership(accounts[1], {from:accounts[2]}));

    });

    it("2. Administrative Operations - Update Token Operator", async function() 
    {

        // Update the Token Operator to accounts[9]
        await updateTokenOperatorAndVeryfy(accounts[9], accounts[0]);

        // Token Operator should be uodated only by Owner
        await testErrorRevert(tokenStake.updateOperator(accounts[8], {from:accounts[1]}));

        // Even the Oprator cannot update to another operator
        await testErrorRevert(tokenStake.updateOperator(accounts[8], {from:accounts[9]}));

    });

    it("2.1 AirDrop Auto Stakes", async function() 
    {

        // Sample Past Stake window - Which is in running state
        // Get the start Period in Epoc Timestamp (In Secs)
        const baseTime = Math.round(Date.now() / 1000);
        const startPeriod = baseTime + 10;
        const endSubmission = startPeriod + 30;
        const endPeriod = endSubmission + 60;
        const maxStake          = (new BigNumber(100)).times(decimalFactor).toFixed(); //100     * 100000000; // Max = 100 SDAO
        const rewardAmount      = (new BigNumber(30)).times(decimalFactor).toFixed(); //30    * 100000000; // Reward = 30 SDAO
        const windowMaxAmount      = (new BigNumber(900)).times(decimalFactor).toFixed(); //900    * 100000000; // window max limit = 900 SDAO
        const bonusAmount = (new BigNumber(0)).times(decimalFactor).toFixed(); //1 * 100000000;

        // acocunts[9] is a Token Operator
        // Open a new Stake
        await openStakeAndVerify(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, accounts[9]);

        // Simulating the air drop stakes for accounts - 1,2,3,4,5
        const stakeAmount_a1 =  (new BigNumber(35)).times(decimalFactor).toFixed(); //35 * 100000000;
        const stakeAmount_a2 =  (new BigNumber(50)).times(decimalFactor).toFixed(); //50 * 100000000;
        const stakeAmount_a3 =  (new BigNumber(90)).times(decimalFactor).toFixed(); //90 * 100000000;
        const stakeAmount_a4 =  (new BigNumber(110)).times(decimalFactor).toFixed(); //110 * 100000000;
        const stakeAmount_a5 =  (new BigNumber(80)).times(decimalFactor).toFixed(); //80 * 100000000;

        const totalStakeAirDroped = (new BigNumber(365)).times(decimalFactor).toFixed(); //365 * 100000000;

        const stakersToAirDrop = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
        const stakeAmountToAirDrop = [stakeAmount_a1, stakeAmount_a2, stakeAmount_a3, stakeAmount_a4, stakeAmount_a5 ]

        // Migrate Stakes
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();
        await airDropStakesAndVerify(currentStakeMapIndex, stakersToAirDrop, stakeAmountToAirDrop, accounts[9]);

        // Deposit the reward amount to the contract
        await depositTokenAndVerify(totalStakeAirDroped , accounts[9]);
        await depositTokenAndVerify(rewardAmount , accounts[9]);


        // Add the rewards for this stake window
        await sleep(await waitTimeInSlot("OPEN_FOR_INCUBATION")); // Sleep to elapse the Submission time

        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[1], bonusAmount, accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[2], bonusAmount, accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[3], bonusAmount, accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[4], bonusAmount, accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], bonusAmount, accounts[9]);

        // Execute all the Rewards in one shot
        const stakers = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]];
        await tokenStake.updateRewards(currentStakeMapIndex, stakers, bonusAmount, {from:accounts[9]});

        // Make sure that the window is closed for the sub sequent test to follow various scenarios
        // End Stake Period
        await sleep(await waitTimeInSlot("END_STAKE")); // Sleep to elapse the Stake Period

        // Claim all the Stakes after the end Period
        await claimStakeAndVerify(currentStakeMapIndex, accounts[1]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[2]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[3]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[4]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[5]);

    });

    it("3. Stake Operations - Open Stake", async function() 
    {

        const stakePeriod = 1 * 60; // 1 min * 60 Sec - In Secs
        // Open Stake for 1 mins

        // Get the start Period in Epoc Timestamp (In Secs)
        const baseTime = Math.round(Date.now() / 1000);
        const startPeriod = baseTime + 10;
        const endSubmission = startPeriod + 30;
        const endPeriod = endSubmission + 60;
        const maxStake          = (new BigNumber(210)).times(decimalFactor).toFixed(); //210     * 100000000; // Max = 100 SDAO
        const rewardAmount      = (new BigNumber(30)).times(decimalFactor).toFixed(); //30    * 100000000; // Reward = 30 SDAO
        const windowMaxAmount   = (new BigNumber(900)).times(decimalFactor).toFixed(); //900    * 100000000; // window max limit = 900 SDAO
        

        // Non Token Operator should allow to open for staking
        await testErrorRevert(tokenStake.openForStake(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, {from:accounts[1]}));

        // Improper Staking Period - Should Fail
        await testErrorRevert(tokenStake.openForStake(startPeriod, endSubmission, endPeriod - 60, rewardAmount, maxStake, windowMaxAmount, {from:accounts[9]}));

        // acocunts[9] is a Token Operator
        await openStakeAndVerify(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, accounts[9]);

        // While Staking is in progress no addition open stake request should allow
        await testErrorRevert(tokenStake.openForStake(startPeriod + 86400, endSubmission + 86400, endPeriod + 86400, rewardAmount, maxStake, windowMaxAmount, {from:accounts[9]}));

    });

    it("4. Stake Operations - Submit Stake", async function() 
    {

        const bonusAmount = (new BigNumber(1)).times(decimalFactor).toFixed(); //1 * 100000000;

        // Get the Current Staking Period Index - Should be the first one
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        const max = 100;
        const stakeAmount_a1 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;
        const stakeAmount_a2 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;
        const stakeAmount_a3 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;
        const stakeAmount_a4 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;
        const stakeAmount_a5 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;

        await sleep(await waitTimeInSlot("OPEN_FOR_SUBMISSION")); // Sleep to start the submissions

        // Submit Stake
        await submitStakeAndVerify(stakeAmount_a1, accounts[1]);
        await submitStakeAndVerify(stakeAmount_a2, accounts[2]);
        await submitStakeAndVerify(stakeAmount_a3, accounts[3]);
        await submitStakeAndVerify(stakeAmount_a4, accounts[4]);
        await submitStakeAndVerify(stakeAmount_a5, accounts[5]);
    
        // 2nd Submit Stake in the same period
        const stakeAmount_a3_2 = (new BigNumber(10)).times(decimalFactor).toFixed();
        await submitStakeAndVerify(stakeAmount_a3_2, accounts[3]);

        // Withdraw Stake
        const stakeAmount_a3_3 = (new BigNumber(5)).times(decimalFactor).toFixed();
        await withdrawStakeAndVerify(currentStakeMapIndex, stakeAmount_a3_3, accounts[3]);

        // Withdraw the Stake more than staked - Should Fail
        //await testErrorRevert(tokenStake.withdrawStake(currentStakeMapIndex, stakeAmount_a5 + 10000000, {from:accounts[5]}));
        const stakeAmount_a5_2 = (new BigNumber(stakeAmount_a5)).plus(decimalFactor);
        await testErrorRevert(tokenStake.withdrawStake(stakeAmount_a5_2, {from:accounts[5]}));

        // Withdraw Full Stake in Submission Phase
        await withdrawStakeAndVerify(currentStakeMapIndex, stakeAmount_a5, accounts[5]);

        // Re-Submit the Stake
        //await submitStakeAndVerify(stakeAmount_a5, accounts[5]);
        await submitStakeForAndVerify(accounts[5], stakeAmount_a5, accounts[6]); // Executed by accounts[6] on behalf of accounts[5]

        // Submit more than the maxLimit allowed - Should Fail
        const stakeAmount_a5_3 = (new BigNumber(stakeAmount_a5)).plus((new BigNumber(3 * max)).times(decimalFactor));
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5_3, {from:accounts[5]}));

        await sleep(await waitTimeInSlot("OPEN_FOR_INCUBATION")); // Sleep to elapse the Submission time

        // Check for Staking after staking submission period - Should Fail
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5, {from:accounts[6]}));
        await testErrorRevert(tokenStake.submitStakeFor(accounts[6], stakeAmount_a5, {from:accounts[6]}));

        // Can be performed only by Token Operator -- Account - 9
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[1], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[2], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[3], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[4], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], bonusAmount, accounts[9]);

        // Reward again to the same account - Should Fail
        await testErrorRevert(computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], bonusAmount, accounts[9]));

        // Claim the stake during the incubation phase - Should Fail
        await testErrorRevert(claimStakeAndVerify(currentStakeMapIndex, accounts[4]));

        // End Stake Period
        await sleep(await waitTimeInSlot("END_STAKE")); // Sleep to elapse the Stake Period

        // Check for Staking after staking period - Should Fail
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5, {from:accounts[5]}));
        await testErrorRevert(tokenStake.submitStakeFor(accounts[5], stakeAmount_a5, {from:accounts[5]}));

    });


    it("5. Stake Operations - Claim Stake", async function() 
    {

        // Get the Current Staking Period Index - Should be the first one
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        // Deposit Reward Amount for the stakers withdrawals to work
        const rewardAmount = (new BigNumber(30)).times(decimalFactor).toFixed(); //30    * 100000000; // Reward = 30 SDAO
        // Deposit the tokens to pool
        await depositTokenAndVerify(rewardAmount , accounts[9]);

        // Account - 5 will be used for auto roll over
        await claimStakeAndVerify(currentStakeMapIndex, accounts[1]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[2]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[3]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[4]);
        
        // Try withdraw the token again - Should Fail
        //await testErrorRevert(tokenStake.claimStake(currentStakeMapIndex, {from:accounts[3]}));
        await testErrorRevert(tokenStake.claimStake({from:accounts[3]}));

    });

    it("6. Stake Pool Operations - Deposit & Withdraw Token from pool by Token Operator", async function() 
    {

        const contractTokenBalance = new BigNumber(await token.balanceOf(tokenStake.address)).toFixed();

        const withdrawAmount =  (new BigNumber(contractTokenBalance)).minus(decimalFactor).toFixed(); //  (contractTokenBalance - 10000000);
        const depositAmount = (new BigNumber(withdrawAmount)).plus(decimalFactor).toFixed(); //withdrawAmount + 1000000000;

        // Withdrawing more than available tokens from pool - Should Fail
        const contractTokenBalance_higher = (new BigNumber(contractTokenBalance)).plus(decimalFactor).toFixed();
        await testErrorRevert(tokenStake.withdrawToken(contractTokenBalance_higher, {from:accounts[9]}));

        // Withdraw the tokens from pool
        await withdrawTokenAndVerify(withdrawAmount, accounts[9]);

        // Deposit the tokens to pool
        await depositTokenAndVerify(depositAmount , accounts[9]);

        // Withdrawing tokens from pool with Owner Account - Should Fail
        await testErrorRevert(tokenStake.withdrawToken(withdrawAmount, {from:accounts[0]}));
        
    });

    it("7. Stake Operations - New Staking Period with Auto Roll Over and New Stakes ", async function() 
    {

        // Always the stake window starts with 1 not with Zero
        const existingStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        // Get the start Period in Epoc Timestamp (In Secs)
        const baseTime = Math.round(Date.now() / 1000);
        const startPeriod = baseTime + 10;
        const endSubmission = startPeriod + 30;
        const endApproval = endSubmission + 20;
        const requestWithdrawStartPeriod = endApproval + 20 
        const endPeriod = requestWithdrawStartPeriod + 20;
        const maxStake          = (new BigNumber(210)).times(decimalFactor).toFixed(); //210     * 100000000; // Max = 110 SDAO
        const rewardAmount      = (new BigNumber(120)).times(decimalFactor).toFixed(); //120   * 100000000; // Reward = 120 SDAO
        const windowMaxAmount      = (new BigNumber(600)).times(decimalFactor).toFixed(); //600    * 100000000; // window max limit = 500 SDAO
        const bonusAmount = (new BigNumber(1)).times(decimalFactor).toFixed(); //1 * 100000000;
        
        // acocunts[9] is a Token Operator
        await openStakeAndVerify(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, accounts[9]);

        const max = 200;
        const stakeAmount_a6 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;
        const stakeAmount_a7 =  (new BigNumber(getRandomNumber(max))).times(decimalFactor).toFixed(); //getRandomNumber(max) * 100000000;

        await sleep(await waitTimeInSlot("OPEN_FOR_SUBMISSION")); // Sleep to start the submissions

        // Submit Stake - New Submissions for this Stake Window
        await submitStakeAndVerify(stakeAmount_a6, accounts[6]);
        await submitStakeAndVerify(stakeAmount_a7, accounts[7]);

        // Get the current Stake Window Index
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        await sleep(await waitTimeInSlot("OPEN_FOR_INCUBATION")); // Sleep to start the reward

        // Can be performed only by Token Operator -- Should Fail
        await testErrorRevert(tokenStake.computeAndAddReward(currentStakeMapIndex, accounts[5], bonusAmount, {from:accounts[5]}));

        // Can be performed only by Token Operator -- Account - 9
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[6], bonusAmount, accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[7], bonusAmount, accounts[9]);

        // End Stake Period
        await sleep(await waitTimeInSlot("END_STAKE")); // Sleep to elapse the Stake Period

        // Deposit the tokens to pool - to make sure enough token are there for withdrawal
        await depositTokenAndVerify(rewardAmount , accounts[9]);

        // Accounts 6 Claiming the Stake
        // Account - 5, 7 is for Auto Roll Over
        await claimStakeAndVerify(currentStakeMapIndex, accounts[6]);

        // Should fail if we try to claim again
        //await testErrorRevert(tokenStake.claimStake(currentStakeMapIndex, {from:accounts[6]}));
        await testErrorRevert(tokenStake.claimStake({from:accounts[6]}));

    });

    it("8. Stake Operations - No more active Stakes Withdrawals", async function() 
    {

        // Staker should be able to withdraw the tokens when there is no active stake - means passing the grace period
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        // Account 5 & 7 is in Auto Roll Over
        await claimStakeAndVerify(currentStakeMapIndex, accounts[5]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[7]);

        //await displayCurrentStateOfContract();

    });

});
