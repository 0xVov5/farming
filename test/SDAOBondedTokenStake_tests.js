"use strict";
var  TokenStake = artifacts.require("./SDAOBondedTokenStake.sol");

let Contract = require("@truffle/contract");
let TokenAbi = require("singularitydao-token-contracts/abi/SDAOToken.json");
let TokenNetworks = require("singularitydao-token-contracts/networks/SDAOToken.json");
let TokenBytecode = require("singularitydao-token-contracts/bytecode/SDAOToken.json");
let Token = Contract({contractName: "SingularityDAOToken", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});
Token.setProvider(web3.currentProvider);

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
  
contract('TokenStake', function(accounts) {

console.log("Number of Accounts - ", accounts.length)

    var tokenStake;
    var tokenAddress;
    var token;
    
    let GAmt = 10000  * 100000000;
    let Amt1 = 10  * 100000000;
    let Amt2 = 20  * 100000000;
    let Amt3 = 30 * 100000000;
    let Amt4 = 40 * 100000000;
    let Amt5 = 50 * 100000000;
    let Amt6 = 60 * 100000000;
    let Amt7 = 70 * 100000000;

    before(async () => 
        {
            tokenStake = await TokenStake.deployed();
            tokenAddress = await tokenStake.token.call();
            token = await Token.at(tokenAddress);

            //console.log("Current Block number - ", (await web3.eth.getBlockNumber()));
            //console.log("maxMigrationBlocks - ", (await tokenStake.maxMigrationBlocks.call()).toNumber());

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

            const windowTotalStake_b = (await tokenStake.windowTotalStake.call()).toNumber();

            // Open Stake for a Given Period
            await tokenStake.openForStake(_startPeriod, _endSubmission, _endPeriod, _rewardAmount, _maxStake, _windowMaxAmount, {from:_account});

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const {found: found_a, approvedAmount: approvedAmount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call("0x0000000000000000000000000000000000000000");

            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = (await tokenStake.windowTotalStake.call()).toNumber();

            // Test the Stake Map Index
            assert.equal(currentStakeMapIndex, currentStakeMapIndex_b + 1);

            // Test the Staking Period Configurations
            assert.equal(startPeriod_a.toNumber(), _startPeriod);
            assert.equal(submissionEndPeriod_a.toNumber(), _endSubmission);
            assert.equal(endPeriod_a.toNumber(), _endPeriod);
            assert.equal(maxStake_a.toNumber(), _maxStake);
            assert.equal(windowTotalStake_a, windowTotalStake_b + _rewardAmount);
            assert.equal(windowRewardAmount_a.toNumber(), _rewardAmount);
            assert.equal(windowMaxAmount_a.toNumber(), _windowMaxAmount);

        }

        const submitStakeAndVerify = async(_stakeAmount, _account) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const wallet_bal_b = (await token.balanceOf(_account)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_b = (await tokenStake.balances(_account)).toNumber();

            const {found: found_b, approvedAmount: approvedAmount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);            

            const windowTotalStake_b = (await tokenStake.windowTotalStake.call()).toNumber();

            // Submit the Stake
            await tokenStake.submitStake( _stakeAmount, {from:_account});

            const {found: found_a, approvedAmount: approvedAmount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = (await tokenStake.windowTotalStake.call()).toNumber();

            const wallet_bal_a = (await token.balanceOf(_account)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_a = (await tokenStake.balances(_account)).toNumber();

            assert.equal(rewardComputeIndex_a.toNumber(), rewardComputeIndex_b.toNumber());


            // Stake Amount Should Increase
            assert.equal(approvedAmount_a.toNumber(), approvedAmount_b.toNumber() + _stakeAmount);

            // Wallet balance should reduce
            assert.equal(wallet_bal_a, wallet_bal_b - _stakeAmount);

            // Contract balance should increase
            assert.equal(contract_bal_a, contract_bal_b + _stakeAmount);

            // Account balance in the contract should increase
            assert.equal(contract_account_bal_a, contract_account_bal_b + _stakeAmount);

            // Should be increased by the amount of new stake submission
            assert.equal(windowTotalStake_a, windowTotalStake_b + _stakeAmount);
        }


        const claimStakeAndVerify = async (_stakeMapIndex, _account) => {

            // Token Balance
            const wallet_bal_b = (await token.balanceOf(_account)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            // Contract Stake Balance
            const contract_account_bal_b = (await tokenStake.balances(_account)).toNumber();

            const {found: found_b, approvedAmount: approvedAmount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_account);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(_stakeMapIndex); 

            const windowTotalStake_b = (await tokenStake.windowTotalStake.call()).toNumber();

            // Call Withdraw Stake
            await tokenStake.claimStake(_stakeMapIndex, {from:_account});

            const {found: found_a, approvedAmount: approvedAmount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_account);

            const windowTotalStake_a = (await tokenStake.windowTotalStake.call()).toNumber();

            // Token Balance
            const wallet_bal_a = (await token.balanceOf(_account)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            // Contract Stake Balance
            const contract_account_bal_a = (await tokenStake.balances(_account)).toNumber();

            let claimAmount = 0;
            claimAmount = approvedAmount_b.toNumber();

            // Wallet Balance should increase
            assert.equal(wallet_bal_b, wallet_bal_a - claimAmount );

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, contract_bal_a + claimAmount );

            // Account Balance, Total Stake & Total Approved Stake in the contract should reduce
            assert.equal(contract_account_bal_b, contract_account_bal_a + claimAmount);

            // Window total amount should reduce
            assert.equal(windowTotalStake_a, windowTotalStake_b - claimAmount);

            // Claimable amount should be reset
            assert.equal(approvedAmount_a.toNumber(), 0);


            // // Amount in the respective staking period should reset to zero
            // //assert.equal(approvedAmount_a.toNumber(), 0);
            // if(claimableAmount_b.toNumber() > 0) {
                
            //     // Claimable amount should be reset
            //     assert.equal(claimableAmount_a.toNumber(), 0);

            //     // There should not be any change to Approved Amount
            //     assert.equal(approvedAmount_a.toNumber(), approvedAmount_b.toNumber());

            //     // There should not be any change to window total amount
            //     assert.equal(windowTotalStake_a, windowTotalStake_b);
                
            // } else {

            //     // Claimable amount should be reset
            //     assert.equal(approvedAmount_a.toNumber(), 0);

            //     // There should not be any change to Claimable Amount
            //     assert.equal(claimableAmount_a.toNumber(), claimableAmount_b.toNumber());

            //     // Window total amount should reduce
            //     assert.equal(windowTotalStake_a, windowTotalStake_b - claimAmount);

            // }

        }

        const withdrawTokenAndVerify = async(_amount, _account) => {

            // Token Balance
            const wallet_bal_b = (await token.balanceOf(_account)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            // Call Withdraw Stake
            await tokenStake.withdrawToken(_amount, {from:_account});

            // Token Balance
            const wallet_bal_a = (await token.balanceOf(_account)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            // Wallet Balance Should Increase
            assert.equal(wallet_bal_b, wallet_bal_a - _amount);

            // Contract Balance Should Reduce
            assert.equal(contract_bal_b, contract_bal_a + _amount);

        }

        const depositTokenAndVerify = async(_amount, _account) => {

            // Token Balance
            const wallet_bal_b = (await token.balanceOf(_account)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            // Call Withdraw Stake
            // await tokenStake.depositToken(_amount, {from:_account});
            await token.transfer(tokenStake.address,  _amount, {from:_account});

            // Token Balance
            const wallet_bal_a = (await token.balanceOf(_account)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            // Wallet Balance Should reduce
            assert.equal(wallet_bal_b, wallet_bal_a + _amount);

            // Contract Balance Should Increase
            assert.equal(contract_bal_b, contract_bal_a - _amount);
            
        }

        const computeAndAddRewardAndVerify = async (existingStakeMapIndex, _staker, _account) => {

            const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

            const wallet_bal_b = (await token.balanceOf(_staker)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_b = (await tokenStake.balances(_staker)).toNumber();

            const {found: found_b, approvedAmount: approvedAmount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_staker);

            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_b = (await tokenStake.windowTotalStake.call()).toNumber();

            // auto renew the Stake
            await tokenStake.computeAndAddReward(existingStakeMapIndex, _staker, {from:_account});

            // Current Stake
            const {found: found_a, approvedAmount: approvedAmount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_staker);

            // Staking Window
            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(currentStakeMapIndex);

            const windowTotalStake_a = (await tokenStake.windowTotalStake.call()).toNumber();

            const wallet_bal_a = (await token.balanceOf(_staker)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_a = (await tokenStake.balances(_staker)).toNumber();

            // Calculate the Reward
            const rewardAmount = Math.floor( approvedAmount_b.toNumber() * windowRewardAmount_b.toNumber() / (windowTotalStake_b - windowRewardAmount_b.toNumber()));

            const newStakeAmount = approvedAmount_b.toNumber() + rewardAmount;
            const returnAmount = 0;//newStakeAmount -  _approvedAmount;    // There will be any return as full amount is Auto Renewed

            // Wallet should balance should increase
            assert.equal(wallet_bal_b, wallet_bal_a - returnAmount);

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, contract_bal_a + returnAmount);

            // Approved Amount should be increased
            assert.equal(approvedAmount_a.toNumber(), approvedAmount_b.toNumber() + rewardAmount);

            // Staking Period Window Total Stake should not change
            assert.equal(windowTotalStake_a, windowTotalStake_b);

            // Account balance in the contract should reduce if approved amount < new staked amount
            assert.equal(contract_account_bal_a, contract_account_bal_b + rewardAmount - returnAmount);

            // Check for the reward computed index
            assert.equal(rewardComputeIndex_a.toNumber(), existingStakeMapIndex)

        }

        const withdrawStakeAndVerify = async (existingStakeMapIndex, _stakeAmount, _account) => {

            const wallet_bal_b = (await token.balanceOf(_account)).toNumber();
            const contract_bal_b = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_b = (await tokenStake.balances(_account)).toNumber();
            
            const {found: found_b, approvedAmount: approvedAmount_b, rewardComputeIndex: rewardComputeIndex_b}
            = await tokenStake.getStakeInfo.call(_account);
            
            const {startPeriod: startPeriod_b, submissionEndPeriod: submissionEndPeriod_b, endPeriod: endPeriod_b, maxStake: maxStake_b, windowRewardAmount: windowRewardAmount_b, windowMaxAmount: windowMaxAmount_b}
            = await tokenStake.stakeMap.call(existingStakeMapIndex);            
            
            // Withdraw the Stake
            await tokenStake.withdrawStake(existingStakeMapIndex, _stakeAmount, {from:_account});
            
            const {found: found_a, approvedAmount: approvedAmount_a, rewardComputeIndex: rewardComputeIndex_a}
            = await tokenStake.getStakeInfo.call(_account);
            
            const {startPeriod: startPeriod_a, submissionEndPeriod: submissionEndPeriod_a, endPeriod: endPeriod_a, maxStake: maxStake_a, windowRewardAmount: windowRewardAmount_a, windowMaxAmount: windowMaxAmount_a}
            = await tokenStake.stakeMap.call(existingStakeMapIndex);
            
            const wallet_bal_a = (await token.balanceOf(_account)).toNumber();
            const contract_bal_a = (await token.balanceOf(tokenStake.address)).toNumber();

            const contract_account_bal_a = (await tokenStake.balances(_account)).toNumber();

            // Stake Amount Should Reduce
            assert.equal(approvedAmount_a.toNumber(), approvedAmount_b.toNumber() - _stakeAmount);

            // Token Balance in the wallet should increase
            assert.equal(wallet_bal_a, wallet_bal_b + _stakeAmount);

            // Contract Token Balance Should Reduce
            assert.equal(contract_bal_b, contract_bal_a + _stakeAmount);

            // Token Balance in the contract should reduce
            assert.equal(contract_account_bal_a, contract_account_bal_b - _stakeAmount);

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
                        console.log("approvedAmount - ", stakeData.approvedAmount.toNumber());
                        console.log("rewardComputeIndex - ", stakeData.rewardComputeIndex.toNumber());
                        console.log("balance - ",(await tokenStake.balances(accounts[i])).toNumber());
    
                        console.log("----------------------------------------------------------------")
                    }
                }
    
                console.log("*******************************Current State of the Contract*************************************")
            }

            console.log("Window Total Stake - ", (await tokenStake.windowTotalStake.call()).toNumber());
            console.log("Contract Balance - ", (await token.balanceOf(tokenStake.address)).toNumber());

            console.log("##############################End of Display##############################")

        }


        // Migrate multiple stakers from previous window
        const airDropStakesAndVerify = async(existingStakeMapIndex, _stakers,_stakeAmounts, _account) => {


            const windowTotalStake_b = (await tokenStake.windowTotalStake.call()).toNumber();

            // Add Air Drop Stakes 
            await tokenStake.airDropStakes(existingStakeMapIndex, _stakers, _stakeAmounts, {from:_account});            


            const windowTotalStake_a = (await tokenStake.windowTotalStake.call()).toNumber();

            // All the stakers balance to be same as air dropped stakeAmount
            let stakersBalInContract = [];
            let totalStakeMigrated = 0;
            for(var i=0; i<_stakers.length;i++) {
                const bal = (await tokenStake.balances(_stakers[i])).toNumber();
                stakersBalInContract.push(bal);

                totalStakeMigrated = totalStakeMigrated + bal;
            }
            assert.deepStrictEqual(_stakeAmounts, stakersBalInContract);

            // Window Total Stake Amount should be with the total amount air dropped stake
            assert.equal(windowTotalStake_a, windowTotalStake_b + totalStakeMigrated);

        }




    // ************************ Test Scenarios Starts From Here ********************************************

    it("0. Initial Account Setup - Transfer & Approve Tokens", async function() 
    {
        // accounts[0] -> Contract Owner
        // accounts[1] to accounts[8] -> Token Stakers
        // accounts[9] -> Token Operator

        // An explicit call is required to mint the tokens for SDAO
        await token.mint(accounts[0], 1000 * GAmt, {from:accounts[0]});

        await approveTokensToContract(1, 9, GAmt);

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
        const maxStake          = 100     * 100000000; // Max = 100 SDAO
        const rewardAmount      = 30    * 100000000; // Reward = 30 SDAO
        const windowMaxAmount      = 900    * 100000000; // window max limit = 900 SDAO

        // acocunts[9] is a Token Operator
        // Open a new Stake
        await openStakeAndVerify(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, accounts[9]);

        // Simulating the air drop stakes for accounts - 1,2,3,4,5
        const stakeAmount_a1 =  35 * 100000000;
        const stakeAmount_a2 =  50 * 100000000;
        const stakeAmount_a3 =  90 * 100000000;
        const stakeAmount_a4 =  110 * 100000000;
        const stakeAmount_a5 =  80 * 100000000;

        const totalStakeAirDroped = 365 * 100000000;

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

        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[1], accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[2], accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[3], accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[4], accounts[9]);
        // await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], accounts[9]);

        // Execute all the Rewards in one shot
        const stakers = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]];
        await tokenStake.updateRewards(currentStakeMapIndex, stakers, {from:accounts[9]});

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
        const maxStake          = 210     * 100000000; // Max = 100 SDAO
        const rewardAmount      = 30    * 100000000; // Reward = 30 SDAO
        const windowMaxAmount      = 900    * 100000000; // window max limit = 900 SDAO

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

        // Get the Current Staking Period Index - Should be the first one
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        const max = 100;
        const stakeAmount_a1 =  getRandomNumber(max) * 100000000;
        const stakeAmount_a2 =  getRandomNumber(max) * 100000000;
        const stakeAmount_a3 =  getRandomNumber(max) * 100000000;
        const stakeAmount_a4 =  getRandomNumber(max) * 100000000;
        const stakeAmount_a5 =  getRandomNumber(max) * 100000000;

        await sleep(await waitTimeInSlot("OPEN_FOR_SUBMISSION")); // Sleep to start the submissions

        // Submit Stake
        await submitStakeAndVerify(stakeAmount_a1, accounts[1]);
        await submitStakeAndVerify(stakeAmount_a2, accounts[2]);
        await submitStakeAndVerify(stakeAmount_a3, accounts[3]);
        await submitStakeAndVerify(stakeAmount_a4, accounts[4]);
        await submitStakeAndVerify(stakeAmount_a5, accounts[5]);
    
        // 2nd Submit Stake in the same period
        await submitStakeAndVerify(10 * 100000000, accounts[3]);

        // Withdraw Stake
        await withdrawStakeAndVerify(currentStakeMapIndex, 5 * 100000000, accounts[3]);

        // Withdraw the Stake more than staked - Should Fail
        await testErrorRevert(tokenStake.withdrawStake(currentStakeMapIndex, stakeAmount_a5 + 10000000, {from:accounts[5]}));

        // Withdraw Full Stake in Submission Phase
        await withdrawStakeAndVerify(currentStakeMapIndex, stakeAmount_a5, accounts[5]);
    
        // Re-Submit the Stake
        await submitStakeAndVerify(stakeAmount_a5, accounts[5]);
        
        // Submit more than the maxLimit allowed - Should Fail
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5 + (max * 100000000), {from:accounts[5]}));


        await sleep(await waitTimeInSlot("OPEN_FOR_INCUBATION")); // Sleep to elapse the Submission time

        // Check for Staking after staking submission period - Should Fail
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5, {from:accounts[6]}));

        // Can be performed only by Token Operator -- Account - 9
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[1], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[2], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[3], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[4], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], accounts[9]);

        // Reward again to the same account - Should Fail
        await testErrorRevert(computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], accounts[9]));
  
        // Claim the stake during the incubation phase - Should Fail
        await testErrorRevert(claimStakeAndVerify(currentStakeMapIndex, accounts[4]));

        // End Stake Period
        await sleep(await waitTimeInSlot("END_STAKE")); // Sleep to elapse the Stake Period

        // Check for Staking after staking period - Should Fail
        await testErrorRevert(tokenStake.submitStake( stakeAmount_a5, {from:accounts[5]}));

    });


    it("5. Stake Operations - Claim Stake", async function() 
    {

        // Get the Current Staking Period Index - Should be the first one
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        // Deposit Reward Amount for the stakers withdrawals to work
        const rewardAmount = 30    * 100000000; // Reward = 30 SDAO
        // Deposit the tokens to pool
        await depositTokenAndVerify(rewardAmount , accounts[9]);

        // Account - 5 will be used for auto roll over
        await claimStakeAndVerify(currentStakeMapIndex, accounts[1]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[2]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[3]);
        await claimStakeAndVerify(currentStakeMapIndex, accounts[4]);
        
        // Try withdraw the token again - Should Fail
        await testErrorRevert(tokenStake.claimStake(currentStakeMapIndex, {from:accounts[3]}));

    });

    it("6. Stake Pool Operations - Deposit & Withdraw Token from pool by Token Operator", async function() 
    {

        const contractTokenBalance = (await token.balanceOf(tokenStake.address)).toNumber();

        const withdrawAmount = (contractTokenBalance - 10000000);
        const depositAmount = withdrawAmount + 1000000000;

        // Withdrawing more than available tokens from pool - Should Fail
        await testErrorRevert(tokenStake.withdrawToken(contractTokenBalance + 10, {from:accounts[9]}));

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
        const maxStake          = 210     * 100000000; // Max = 110 SDAO
        const rewardAmount      = 120   * 100000000; // Reward = 120 SDAO
        const windowMaxAmount      = 600    * 100000000; // window max limit = 500 SDAO
        
        // acocunts[9] is a Token Operator
        await openStakeAndVerify(startPeriod, endSubmission, endPeriod, rewardAmount, maxStake, windowMaxAmount, accounts[9]);

        const max = 200;
        const stakeAmount_a6 =  getRandomNumber(max) * 100000000;
        const stakeAmount_a7 =  getRandomNumber(max) * 100000000;

        await sleep(await waitTimeInSlot("OPEN_FOR_SUBMISSION")); // Sleep to start the submissions

        // Submit Stake - New Submissions for this Stake Window
        await submitStakeAndVerify(stakeAmount_a6, accounts[6]);
        await submitStakeAndVerify(stakeAmount_a7, accounts[7]);

        // Get the current Stake Window Index
        const currentStakeMapIndex = (await tokenStake.currentStakeMapIndex.call()).toNumber();

        await sleep(await waitTimeInSlot("OPEN_FOR_INCUBATION")); // Sleep to start the reward

        // Can be performed only by Token Operator -- Should Fail
        await testErrorRevert(tokenStake.computeAndAddReward(currentStakeMapIndex, accounts[5], {from:accounts[5]}));

        // Can be performed only by Token Operator -- Account - 9
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[5], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[6], accounts[9]);
        await computeAndAddRewardAndVerify(currentStakeMapIndex, accounts[7], accounts[9]);

        // End Stake Period
        await sleep(await waitTimeInSlot("END_STAKE")); // Sleep to elapse the Stake Period

        // Deposit the tokens to pool - to make sure enough token are there for withdrawal
        await depositTokenAndVerify(rewardAmount , accounts[9]);

        // Accounts 6 Claiming the Stake
        // Account - 5, 7 is for Auto Roll Over
        await claimStakeAndVerify(currentStakeMapIndex, accounts[6]);

        // Should fail if we try to claim again
        await testErrorRevert(tokenStake.claimStake(currentStakeMapIndex, {from:accounts[6]}));

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
