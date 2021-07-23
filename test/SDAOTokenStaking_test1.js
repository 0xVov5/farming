const { expectRevert, time } = require('@openzeppelin/test-helpers');
const SDAOToken = artifacts.require('ERC20Mock');
const SDAOTokenStaking = artifacts.require('SDAOTokenStaking');
const MockERC20 = artifacts.require('ERC20Mock');

contract('SDAOTokenStaking', ([alice, bob, carol, dev, minter]) => {


    beforeEach(async () => {
        this.sdao = await SDAOToken.new('SDAO', 'SDAO', '100000000000000000', { from: minter });
    });



    context('With ERC/LP token added to the field', () => {

        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000000', { from: minter });
            await this.lp2.transfer(alice, '2000', { from: minter });
            await this.lp2.transfer(bob, '2000', { from: minter });
            await this.lp2.transfer(carol, '2000', { from: minter });
            
         //   await this.sdao .transfer(alice, '329', { from: minter });
        });


           it('check if reward gets updated after end of epoch', async () => {
          
            //=> block 0 = block 21

            this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
            await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

            await this.sdaostaking.addRewards("10000000000", { from: minter });
           
            await this.sdaostaking.add('10', this.lp.address, "1","340", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
            await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            await this.sdaostaking.deposit("0", '100', alice, { from: alice });

            await time.advanceBlockTo("340");
            assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '321');
            await time.advanceBlockTo("500");
            assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '321');
            
           

        });


        it('should distribute SDAOs properly for a staker', async () => {

                this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
            await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

            await this.sdaostaking.addRewards("10000000000", { from: minter });
        
            await this.sdaostaking.add('10', this.lp.address, "1","1000", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
            await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            await this.sdaostaking.deposit("0", '100', alice, { from: alice });

            await time.advanceBlockTo("852");
            assert.equal((await this.sdaostaking.pendingRewards("0",alice)).valueOf().toString(), '337');
             await this.sdaostaking.harvest("0", alice, { from: alice });
            assert.equal((await this.sdao.balanceOf(alice)).valueOf().toString(), '338');
        
        });



          it('check cant deposit after end of epoch', async () => {
          
            
            this.sdaostaking = await SDAOTokenStaking.new(this.sdao.address, { from: minter });
            await this.sdao.approve(this.sdaostaking.address, "10000000000", { from: minter  });

            await this.sdaostaking.addRewards("10000000000", { from: minter });
  
            await this.sdaostaking.add('10', this.lp.address, "1","500", { from: minter }); ////set unix time stamp to now  to check https://www.unixtimestamp.com/
            await this.lp.approve(this.sdaostaking.address, '1000', { from: alice });
            

            await this.lp.approve(this.sdaostaking.address, '1000', { from: bob });
            await expectRevert(this.sdaostaking.deposit("0", '1000', bob, { from: bob }),"This pool epoch has ended. Please join staking new cession."); // should throw exception
            

        });

        

    });
});