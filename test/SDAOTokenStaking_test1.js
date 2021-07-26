const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const SDAOToken = artifacts.require('ERC20Mock');
const SDAOTokenStaking = artifacts.require('SDAOTokenStaking');
const MockERC20 = artifacts.require('ERC20Mock');

contract('SDAOTokenStaking', ([alice, bob, carol, dev, minter]) => {


    before(async () => {
        this.sdao = await SDAOToken.new('SDAO', 'SDAO', '100000000', { from: minter });
    });


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

            this.lp = await MockERC20.new('LPToken', 'LP', '10000000', { from: minter });
            
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000', { from: minter });
            
            await this.lp2.transfer(alice, '2000', { from: minter });
            await this.lp2.transfer(bob, '2000', { from: minter });
            await this.lp2.transfer(carol, '2000', { from: minter });
            
        });


        it('Create staking instance and Add rewards', async () => {

            const stakingReward = 10000000;

            // Create the Staking Contract Instance
            this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });

            // add the rewards to the Staking Contract
            await this.sdao.approve(this.sdaostaking.address, stakingReward, { from: minter  });

            const minterRewardTokenBal = (await this.sdao.balanceOf(minter)).toNumber();
            const totalRewardsReceived = (await this.sdaostaking.totalRewardsReceived()).toNumber();
            await this.sdaostaking.addRewards(stakingReward, { from: minter });

            // Minter balance should reduce
            assert.equal((await this.sdao.balanceOf(minter)).toNumber(), minterRewardTokenBal - stakingReward);

            // Total Rewards Received in the contract should get incremented
            assert.equal((await this.sdaostaking.totalRewardsReceived()).toNumber(), totalRewardsReceived + stakingReward);

        });

        it('Create epoc with One Staker for end to end operations', async () => {
        
            //Epoc - => block 0 = block 21

            // Get the Next Pool Id
            const poolId = (await this.sdaostaking.poolLength()).toNumber();

            let blockNumber = await web3.eth.getBlockNumber();
            let endEpoCBlockNumber = blockNumber + 40;
            let rewardPerBlock = 1;
            let stakeAmount = 100;

            // Create a New Pool
            await this.sdaostaking.add(this.lp.address, rewardPerBlock, endEpoCBlockNumber , { from: minter }); 
            
            // Pool Id should get incremented
            assert.equal((await this.sdaostaking.poolLength()).toNumber(), poolId + 1);

            // Approve and Deposit into the Pool 
            await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            const depositLog = await this.sdaostaking.deposit(poolId, stakeAmount, alice, { from: alice });

            //console.log("depositLog - ", depositLog);            

            // Advance by Block Number and compare the Rewards
            const rewards_b = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            await time.advanceBlock();
            const rewards_a = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            // Should increment by tokenPerBlock = 1
            assert.equal(rewards_b + 1, rewards_a);

            // Deposit to Non existing Pool Should fail
            await expectRevert(this.sdaostaking.deposit("1001", '100', alice, { from: alice }), "invalid opcode");

            //await displayPoolInfo(poolId);

            await time.advanceBlockTo(blockNumber + 20);
            assert.equal((await this.sdaostaking.pendingRewards(poolId,alice)).toNumber(), 17);

            // At the end of the epoc
            await time.advanceBlockTo(blockNumber + 40);
            assert.equal((await this.sdaostaking.pendingRewards(poolId,alice)).toNumber(), 37);

            // At the end of epoc and passing few more blocks - there should be no change in the rewards from previous step
            await time.advanceBlockTo(blockNumber + 60);
            assert.equal((await this.sdaostaking.pendingRewards(poolId,alice)).toNumber(), 37);

            
            // Call the withdrawAndHarvest function to claim along with the reward
            const expectedReward = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            const aliceRewardsTokenBal_b = (await this.sdao.balanceOf(alice)).toNumber();
            const aliceLPTokenBal_b = (await this.lp.balanceOf(alice)).toNumber();

            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmount, alice, { from: alice });

            const aliceRewardsTokenBal_a = (await this.sdao.balanceOf(alice)).toNumber();
            const aliceLPTokenBal_a = (await this.lp.balanceOf(alice)).toNumber();

            assert.equal(aliceRewardsTokenBal_a, aliceRewardsTokenBal_b + expectedReward);
            assert.equal(aliceLPTokenBal_a, aliceLPTokenBal_b + stakeAmount);
        
        });

        it('Create epoc with multiple Stakers for end to end operations', async () => {
        
            //Epoc - => block 0 = block 21

            // Get the Next Pool Id
            const poolId = (await this.sdaostaking.poolLength()).toNumber();

            let blockNumber = await web3.eth.getBlockNumber();
            let endEpoCBlockNumber = blockNumber + 40;
            let rewardPerBlock = 4;
            let stakeAmountAlice = 100;
            let stakeAmountBob = 300;

            // Create a New Pool
            await this.sdaostaking.add(this.lp.address, rewardPerBlock, endEpoCBlockNumber , { from: minter }); 
            
            // Pool Id should get incremented
            assert.equal((await this.sdaostaking.poolLength()).toNumber(), poolId + 1);

            // Alice - Approve and Deposit into the Pool 
            await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            const depositAliceLog = await this.sdaostaking.deposit(poolId, stakeAmountAlice, alice, { from: alice });

            // Bob - Approve and Deposit into the Pool 
            await this.lp.approve(this.sdaostaking.address, '1000', { from: bob });
            const depositBobLog = await this.sdaostaking.deposit(poolId, stakeAmountBob, bob, { from: bob });

            //await displayPoolInfo(poolId);       

            // Advance by Block Number and compare the Rewards
            const rewardsAlice_b = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            const rewardsBob_b = (await this.sdaostaking.pendingRewards(poolId,bob)).toNumber();
            await time.advanceBlock();
            const rewardsAlice_a = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            const rewardsBob_a = (await this.sdaostaking.pendingRewards(poolId,bob)).toNumber();

            // Alice Rewards - Should increment by 1 (100 * 4 /  400) for tokenPerBlock = 4
            assert.equal(rewardsAlice_b + 1, rewardsAlice_a);

            // Alice Rewards - Should increment by 3 (300 * 4 /  400) for tokenPerBlock = 4
            assert.equal(rewardsBob_b + 3, rewardsBob_a);
            

            // Moved to the end of the epoc
            await time.advanceBlockTo(endEpoCBlockNumber + 10);

            const expectedRewardAlice = (await this.sdaostaking.pendingRewards(poolId,alice)).toNumber();
            const expectedRewardBob = (await this.sdaostaking.pendingRewards(poolId,bob)).toNumber();

            const calcRewardAlice =  ((depositBobLog.receipt.blockNumber - depositAliceLog.receipt.blockNumber) * rewardPerBlock) + ((endEpoCBlockNumber - depositBobLog.receipt.blockNumber) * 1);
            const calcRewardBob = (endEpoCBlockNumber - depositBobLog.receipt.blockNumber) * 3;

            assert(expectedRewardAlice, calcRewardAlice);
            assert(expectedRewardBob, calcRewardBob);

            // WithdrawAndHarvest from this pool
            const aliceRewardsTokenBal_b = (await this.sdao.balanceOf(alice)).toNumber();
            const aliceLPTokenBal_b = (await this.lp.balanceOf(alice)).toNumber();
            const bobRewardsTokenBal_b = (await this.sdao.balanceOf(bob)).toNumber();
            const bobLPTokenBal_b = (await this.lp.balanceOf(bob)).toNumber();

            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountAlice, alice, { from: alice });
            await this.sdaostaking.withdrawAndHarvest(poolId, stakeAmountBob, bob, { from: bob });

            const aliceRewardsTokenBal_a = (await this.sdao.balanceOf(alice)).toNumber();
            const aliceLPTokenBal_a = (await this.lp.balanceOf(alice)).toNumber();
            const bobRewardsTokenBal_a = (await this.sdao.balanceOf(bob)).toNumber();
            const bobLPTokenBal_a = (await this.lp.balanceOf(bob)).toNumber();


            assert.equal(aliceRewardsTokenBal_a, aliceRewardsTokenBal_b + expectedRewardAlice);
            assert.equal(aliceLPTokenBal_a, aliceLPTokenBal_b + stakeAmountAlice);

            assert.equal(bobRewardsTokenBal_a, bobRewardsTokenBal_b + expectedRewardBob);
            assert.equal(bobLPTokenBal_a, bobLPTokenBal_b + stakeAmountBob);

            //await displayPoolInfo(poolId);
        
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