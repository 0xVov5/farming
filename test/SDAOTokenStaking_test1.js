const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const SDAOToken = artifacts.require('ERC20Mock');
const SDAOTokenStaking = artifacts.require('SDAOTokenStaking');
const MockERC20 = artifacts.require('ERC20Mock');
let BigNumber = require("bignumber.js");


const decimals = 18;
const rewardsFactor = (new BigNumber(10)).pow(decimals); 

contract('SDAOTokenStaking', ([alice, bob, carol, dev, minter]) => {


    before(async () => {

        const initialMint = "500000000";
        const initialMintBN = (new BigNumber(initialMint)).times(rewardsFactor);
        
        this.sdao = await SDAOToken.new('SDAO', 'SDAO', initialMintBN.toFixed(), { from: minter });

    });


    const displayUserInfo = async(poolId, userWallet) => {

        console.log("PoolId - ", poolId);
        const {amount, rewardDebt} = await this.sdaostaking.userInfo.call(poolId, userWallet);

        console.log("amount - ", amount.toString());
        console.log("rewardDebt", rewardDebt.toString());

    }

    const displayPoolInfo = async(poolId) => {

        console.log("PoolId - ", poolId);
        const {tokenPerBlock, lpSupply, accRewardsPerShare, lastRewardBlock, endOfEpochBlock} = await this.sdaostaking.poolInfo.call(poolId);

        console.log("tokenPerBlock - ", tokenPerBlock.toString())
        console.log("lpSupply", lpSupply.toString())
        console.log("accRewardsPerShare - ", accRewardsPerShare.toString())
        console.log("lastRewardBlock - ", lastRewardBlock.toString())
        console.log("endOfEpochBlock - ", endOfEpochBlock.toString())

    }


    context('With ERC/LP token added to the field', () => {

        before(async () => {

            const initialMint = "500000000";
            const initialMintBN = (new BigNumber(initialMint)).times(rewardsFactor);

            const initialLPTransferBN = (new BigNumber("10000")).times(rewardsFactor);
            const initialLP2TransferBN = (new BigNumber("20000")).times(rewardsFactor);

            this.lp = await MockERC20.new('LPToken', 'LP', initialMintBN.toFixed(), { from: minter });
            
            await this.lp.transfer(alice, initialLPTransferBN.toFixed(), { from: minter });
            await this.lp.transfer(bob, initialLPTransferBN.toFixed(), { from: minter });
            await this.lp.transfer(carol, initialLPTransferBN.toFixed(), { from: minter });
            
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', initialMintBN.toFixed(), { from: minter });
            
            await this.lp2.transfer(alice, initialLP2TransferBN.toFixed(), { from: minter });
            await this.lp2.transfer(bob, initialLP2TransferBN.toFixed(), { from: minter });
            await this.lp2.transfer(carol, initialLP2TransferBN.toFixed(), { from: minter });
            
        });


        it('Create staking instance and Add rewards', async () => {

            const stakingReward = 10000000;
            const stakingRewardBN = (new BigNumber(stakingReward)).times(rewardsFactor);


            // Create the Staking Contract Instance
            this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });

            // add the rewards to the Staking Contract
            await this.sdao.approve(this.sdaostaking.address, stakingRewardBN.toFixed(), { from: minter  });

            const minterRewardTokenBal = await this.sdao.balanceOf(minter);
            const totalRewardsReceived = await this.sdaostaking.totalRewardsReceived();
            await this.sdaostaking.addRewards(stakingRewardBN.toFixed(), { from: minter });

            // Minter balance should reduce
            assert.equal((new BigNumber(await this.sdao.balanceOf(minter))).toFixed(), (new BigNumber(minterRewardTokenBal)).minus(stakingRewardBN).toFixed());

            // Total Rewards Received in the contract should get incremented
            assert.equal((new BigNumber(await this.sdaostaking.totalRewardsReceived())).toFixed(), (new BigNumber(totalRewardsReceived)).plus(stakingRewardBN).toFixed());
            
        });

        it('Create epoc with One Staker for end to end operations', async () => {
        
            //Epoc - => block 0 = block 21

            // Get the Next Pool Id
            const poolId = (await this.sdaostaking.poolLength()).toNumber();

            let blockNumber = await web3.eth.getBlockNumber();
            let endEpoCBlockNumber = blockNumber + 40;
            let rewardPerBlock = 1;
            const rewardPerBlockBN = (new BigNumber(rewardPerBlock)).times(rewardsFactor);
            let stakeAmount = 100;
            const stakeAmountBN = (new BigNumber(stakeAmount)).times(rewardsFactor);

            // Create a New Pool
            await this.sdaostaking.add(this.lp.address, rewardPerBlockBN.toFixed(), endEpoCBlockNumber , { from: minter }); 
            
            // Pool Id should get incremented
            assert.equal((await this.sdaostaking.poolLength()).toNumber(), poolId + 1);

            // Approve and Deposit into the Pool 
            const approveAmountBN = (new BigNumber("1000")).times(rewardsFactor);
            await this.lp.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: alice });
            const depositLog = await this.sdaostaking.deposit(poolId, stakeAmountBN.toFixed(), alice, { from: alice });

            //console.log("depositLog - ", depositLog);            

            // Advance by Block Number and compare the Rewards
            const rewards_b = await this.sdaostaking.pendingRewards(poolId,alice);
            await time.advanceBlock();
            const rewards_a = await this.sdaostaking.pendingRewards(poolId,alice);
            // Should increment by tokenPerBlock = 1
            assert.equal((new BigNumber(rewards_b)).plus(rewardPerBlockBN).toFixed(), (new BigNumber(rewards_a)).toFixed());

            // Deposit to Non existing Pool Should fail
            await expectRevert(this.sdaostaking.deposit("1001", '100', alice, { from: alice }), "invalid opcode");

            //await displayPoolInfo(poolId);

            await time.advanceBlockTo(blockNumber + 20);
            assert.equal((new BigNumber(await this.sdaostaking.pendingRewards(poolId,alice))).toFixed(), (new BigNumber(17)).times(rewardsFactor).toFixed());

            // At the end of the epoc
            await time.advanceBlockTo(blockNumber + 40);
            assert.equal((new BigNumber(await this.sdaostaking.pendingRewards(poolId,alice))).toFixed(), (new BigNumber(37)).times(rewardsFactor).toFixed());

            // At the end of epoc and passing few more blocks - there should be no change in the rewards from previous step
            await time.advanceBlockTo(blockNumber + 60);
            assert.equal((new BigNumber(await this.sdaostaking.pendingRewards(poolId,alice))).toFixed(), (new BigNumber(37)).times(rewardsFactor).toFixed());

            //await displayUserInfo(poolId, alice);
            
            // Call the withdrawAndHarvest function to claim along with the reward
            const expectedReward = await this.sdaostaking.pendingRewards(poolId,alice);
            const aliceRewardsTokenBal_b = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_b = await this.lp.balanceOf(alice);

            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountBN.toFixed(), alice, { from: alice });

            const aliceRewardsTokenBal_a = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_a = await this.lp.balanceOf(alice);

            assert.equal((new BigNumber(aliceRewardsTokenBal_a)).toFixed(), (new BigNumber(aliceRewardsTokenBal_b)).plus(expectedReward).toFixed());
            assert.equal((new BigNumber(aliceLPTokenBal_a)).toFixed(), stakeAmountBN.plus(aliceLPTokenBal_b).toFixed());
        
        });

        it('Create epoc with multiple Stakers for end to end operations', async () => {
        
            //Epoc - => block 0 = block 21

            // Get the Next Pool Id
            const poolId = (await this.sdaostaking.poolLength()).toNumber();

            let blockNumber = await web3.eth.getBlockNumber();
            let endEpoCBlockNumber = blockNumber + 40;
            let rewardPerBlock = 4;
            const rewardPerBlockBN = (new BigNumber(rewardPerBlock)).times(rewardsFactor);
            let stakeAmountAliceBN = (new BigNumber(100)).times(rewardsFactor);
            let stakeAmountBobBN = (new BigNumber(300)).times(rewardsFactor);

            const approveAmountBN = (new BigNumber("1000")).times(rewardsFactor);

            // Create a New Pool
            await this.sdaostaking.add(this.lp.address, rewardPerBlockBN.toFixed(), endEpoCBlockNumber , { from: minter }); 
            
            // Pool Id should get incremented
            assert.equal((await this.sdaostaking.poolLength()).toNumber(), poolId + 1);

            // Alice - Approve and Deposit into the Pool 
            await this.lp.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: alice });
            const depositAliceLog = await this.sdaostaking.deposit(poolId, stakeAmountAliceBN.toFixed(), alice, { from: alice });

            // Bob - Approve and Deposit into the Pool 
            await this.lp.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: bob });
            const depositBobLog = await this.sdaostaking.deposit(poolId, stakeAmountBobBN.toFixed(), bob, { from: bob });

            //await displayPoolInfo(poolId);       

            // Advance by Block Number and compare the Rewards
            const rewardsAlice_b = await this.sdaostaking.pendingRewards(poolId,alice);
            const rewardsBob_b = await this.sdaostaking.pendingRewards(poolId,bob);
            await time.advanceBlock();
            const rewardsAlice_a = await this.sdaostaking.pendingRewards(poolId,alice);
            const rewardsBob_a = await this.sdaostaking.pendingRewards(poolId,bob);

            // Alice Rewards - Should increment by 1 (100 * 4 /  400) for tokenPerBlock = 4 
            assert.equal((new BigNumber(rewardsAlice_b)).plus((new BigNumber(1).times(rewardsFactor))).toFixed(), (new BigNumber(rewardsAlice_a).toFixed()));

            // Alice Rewards - Should increment by 3 (300 * 4 /  400) for tokenPerBlock = 4
            //assert.equal(rewardsBob_b + 3, rewardsBob_a);
            assert.equal((new BigNumber(rewardsBob_b)).plus((new BigNumber(3).times(rewardsFactor))).toFixed(), (new BigNumber(rewardsBob_a).toFixed()));
            

            // Moved to the end of the epoc
            await time.advanceBlockTo(endEpoCBlockNumber + 10);

            const expectedRewardAlice = await this.sdaostaking.pendingRewards(poolId,alice);
            const expectedRewardBob = await this.sdaostaking.pendingRewards(poolId,bob);

            const calcRewardAlice =  ((depositBobLog.receipt.blockNumber - depositAliceLog.receipt.blockNumber) * rewardPerBlock) + ((endEpoCBlockNumber - depositBobLog.receipt.blockNumber) * 1);
            const calcRewardBob = (endEpoCBlockNumber - depositBobLog.receipt.blockNumber) * 3;

            assert((new BigNumber(expectedRewardAlice)).toFixed(), (new BigNumber(calcRewardAlice)).times(rewardsFactor).toFixed());
            assert((new BigNumber(expectedRewardBob)).toFixed(), (new BigNumber(calcRewardBob)).times(rewardsFactor).toFixed());

            // WithdrawAndHarvest from this pool
            const aliceRewardsTokenBal_b = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_b = await this.lp.balanceOf(alice);
            const bobRewardsTokenBal_b = await this.sdao.balanceOf(bob);
            const bobLPTokenBal_b = await this.lp.balanceOf(bob);

            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountAliceBN.toFixed(), alice, { from: alice });
            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountBobBN.toFixed(), bob, { from: bob });

            const aliceRewardsTokenBal_a = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_a = await this.lp.balanceOf(alice);
            const bobRewardsTokenBal_a = await this.sdao.balanceOf(bob);
            const bobLPTokenBal_a = await this.lp.balanceOf(bob);


            assert.equal((new BigNumber(aliceRewardsTokenBal_a)).toFixed(), (new BigNumber(aliceRewardsTokenBal_b)).plus(expectedRewardAlice).toFixed());
            assert.equal((new BigNumber(aliceLPTokenBal_a)).toFixed(), (new BigNumber(aliceLPTokenBal_b)).plus(stakeAmountAliceBN).toFixed());

            assert.equal((new BigNumber(bobRewardsTokenBal_a)).toFixed(), (new BigNumber(bobRewardsTokenBal_b)).plus(expectedRewardBob).toFixed());
            assert.equal((new BigNumber(bobLPTokenBal_a)).toFixed(), (new BigNumber(bobLPTokenBal_b)).plus(stakeAmountBobBN).toFixed());

            //await displayPoolInfo(poolId);
        
        });


        it('Create the new epoc with the real production numbers', async () => { 

            // Stake Amount for Multiple Stakers
            let stakeAmountAliceBN = (new BigNumber(8570)).times(rewardsFactor);
            let stakeAmountBobBN = (new BigNumber(6312)).times(rewardsFactor);
            let stakeAmountCarolBN = (new BigNumber(948)).times(rewardsFactor);
            
            // constant approval amount
            const approveAmountBN = (new BigNumber("10000")).times(rewardsFactor);

            // Alice, Bob, Carol - Approve for the lp2 token address to use it in staking
            await this.lp2.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: alice });
            await this.lp2.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: bob });
            await this.lp2.approve(this.sdaostaking.address, approveAmountBN.toFixed(), { from: carol });

            // Pool details
            const poolId = (await this.sdaostaking.poolLength()).toNumber();
            let blockNumber = await web3.eth.getBlockNumber();
            let endEpoCBlockNumber = blockNumber + 40;
            let rewardPerBlock = "195343022347242000";   // ~0.1953 Rewards per Block
            const rewardPerBlockBN = new BigNumber(rewardPerBlock)

            // Add a New pool for LP2 Tokens
            await this.sdaostaking.add(this.lp2.address, rewardPerBlockBN.toFixed(), endEpoCBlockNumber , { from: minter }); 

            // Pool Id should get incremented
            assert.equal((await this.sdaostaking.poolLength()).toNumber(), poolId + 1);

            //Deposits in the Pool by advancing by 5 blocks for each deposits
            const depositAliceLog = await this.sdaostaking.deposit(poolId, stakeAmountAliceBN.toFixed(), alice, { from: alice });
            await time.advanceBlockTo(blockNumber + 5);
            const depositBobLog = await this.sdaostaking.deposit(poolId, stakeAmountBobBN.toFixed(), bob, { from: bob });
            await time.advanceBlockTo(blockNumber + 10);
            const depositCarolLog = await this.sdaostaking.deposit(poolId, stakeAmountCarolBN.toFixed(), carol, { from: carol });


            // Capture the Rewards & LP2 Token balance after LP2 deposit
            const aliceRewardsTokenBal_b = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_b = await this.lp2.balanceOf(alice);
            const bobRewardsTokenBal_b = await this.sdao.balanceOf(bob);
            const bobLPTokenBal_b = await this.lp2.balanceOf(bob);
            const carolRewardsTokenBal_b = await this.sdao.balanceOf(carol);
            const carolLPTokenBal_b = await this.lp2.balanceOf(carol);

            // Advance by another 20 Blocks
            await time.advanceBlockTo(blockNumber + 20);

            // Bob goes with Harvest
            const expectedRewardBob_1 = await this.sdaostaking.pendingRewards(poolId,bob);
            await this.sdaostaking.harvest(poolId, bob, { from: bob });

            // Bob Rewards Token Balance should increase


            // Advance by another 5 Blocks
            await time.advanceBlockTo(blockNumber + 25);

            // Carol Withdraws & Harvest
            const expectedRewardCarol = await this.sdaostaking.pendingRewards(poolId,carol);
            const withdrawHarvestCarolLog = await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountCarolBN.toFixed(), carol, { from: carol });


            // Carol Rewards & LP Token Balance should increase
            const calcRewardsCarol = rewardPerBlockBN.times(
                                        (withdrawHarvestCarolLog.receipt.blockNumber - depositCarolLog.receipt.blockNumber - 1)
                                    ).times(rewardsFactor).div(
                                        stakeAmountAliceBN.plus(stakeAmountBobBN).plus(stakeAmountCarolBN)
                                    ).times(stakeAmountCarolBN).div(rewardsFactor);

            // Move to end of the epoc
            await time.advanceBlockTo(endEpoCBlockNumber + 10);


            // Alice, Bob Withdraws and Harvest
            const expectedRewardAlice = await this.sdaostaking.pendingRewards(poolId,alice);
            const expectedRewardBob_2 = await this.sdaostaking.pendingRewards(poolId,bob);
            //const expectedRewardCarol_0 = await this.sdaostaking.pendingRewards(poolId,carol);
            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountAliceBN.toFixed(), alice, { from: alice });
            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountBobBN.toFixed(), bob, { from: bob });

            // Capture the Rewards & LP2 Token balance after Withdraw
            const aliceRewardsTokenBal_a = await this.sdao.balanceOf(alice);
            const aliceLPTokenBal_a = await this.lp2.balanceOf(alice);
            const bobRewardsTokenBal_a = await this.sdao.balanceOf(bob);
            const bobLPTokenBal_a = await this.lp2.balanceOf(bob);
            const carolRewardsTokenBal_a = await this.sdao.balanceOf(carol);
            const carolLPTokenBal_a = await this.lp2.balanceOf(carol);

// console.log("a rewards - ", (new BigNumber(expectedRewardAlice)).toFixed());
// console.log("b rewards - ", (new BigNumber(expectedRewardBob_1)).toFixed());
// console.log("b rewards - ", (new BigNumber(expectedRewardBob_2)).toFixed());
// console.log("c rewards - ", (new BigNumber(expectedRewardCarol)).toFixed());

            assert.equal((new BigNumber(aliceRewardsTokenBal_a)).toFixed(), (new BigNumber(aliceRewardsTokenBal_b)).plus(expectedRewardAlice).toFixed());
            assert.equal((new BigNumber(aliceLPTokenBal_a)).toFixed(), (new BigNumber(aliceLPTokenBal_b)).plus(stakeAmountAliceBN).toFixed());

            // Bob has two time harvest & withdrawAndHarvest
            //assert.equal((new BigNumber(bobRewardsTokenBal_a)).toFixed(), (new BigNumber(bobRewardsTokenBal_b)).plus(expectedRewardBob_1).plus(expectedRewardBob_2).toFixed());
            assert.equal((new BigNumber(bobLPTokenBal_a)).toFixed(), (new BigNumber(bobLPTokenBal_b)).plus(stakeAmountBobBN).toFixed());

            //assert.equal((new BigNumber(carolRewardsTokenBal_a)).toFixed(), (new BigNumber(carolRewardsTokenBal_b)).plus(expectedRewardCarol).toFixed());
            assert.equal((new BigNumber(carolLPTokenBal_a)).toFixed(), (new BigNumber(carolLPTokenBal_b)).plus(stakeAmountCarolBN).toFixed());


        });


        // it('check if reward gets updated after end of epoch', async () => {
          
        //     //=> block 0 = block 21

        //     this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
        //     await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

        //     await this.sdaostaking.addRewards("10000000000", { from: minter });
           
        //     await this.sdaostaking.add('10', this.lp.address, "1","340", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
        //     await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
        //     await this.sdaostaking.deposit("0", '100', alice, { from: alice });

        //     await time.advanceBlockTo("340");
        //     assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '321');
        //     await time.advanceBlockTo("500");
        //     assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '321');
            
           

        // });



        // it('should distribute SDAOs properly for a staker', async () => {

        //     this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
        //     await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

        //     await this.sdaostaking.addRewards("10000000000", { from: minter });
        
        //     await this.sdaostaking.add(this.lp.address, "1","1000", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
        //     await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
        //     await this.sdaostaking.deposit("0", '100', alice, { from: alice });

        //     await time.advanceBlockTo("852");
        //     assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '337');
        //      await this.sdaostaking.harvest("0", alice, { from: alice });
        //     assert.equal((await this.sdao.balanceOf(alice)).valueOf().toString(), '338');
        
        // });



        //   it('check cant deposit after end of epoch', async () => {
          
            
        //     this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
        //     await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

        //     await this.sdaostaking.addRewards("10000000000", { from: minter });
  
        //     await this.sdaostaking.add(this.lp.address, "1","500", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
        //     await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            

        //     await this.lp.approve(this.sdaostaking.address, '1000', { from: bob });
        //     await expectRevert(this.sdaostaking.deposit("0", '1000', bob, { from: bob }),"This pool epoch has ended. Please join staking new cession."); // should throw exception
            

        // });

        

    });
});