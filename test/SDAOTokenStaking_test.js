"use strict";
var  SDAOTokenStaking = artifacts.require("./SDAOTokenStaking.sol");

let Contract = require("@truffle/contract");

// To set the SDAO Token Contract on need basis 
//let TokenAbi = require("singularitydao-token-contracts/abi/SingularityDAOToken.json");
//let TokenNetworks = require("singularitydao-token-contracts/networks/SingularityDAOToken.json");
//let TokenBytecode = require("singularitydao-token-contracts/bytecode/SingularityDAOToken.json");
//let Token = Contract({contractName: "SingularityDAO", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});
//Token.setProvider(web3.currentProvider);

var ethereumjsabi  = require('ethereumjs-abi');
var ethereumjsutil = require('ethereumjs-util');

async function testErrorRevert(prom)
{
    let rezE = -1
    try { await prom }
    catch(e) {
        rezE = e.message.indexOf('revert')       
    }
    assert(rezE >= 0, "Must generate error and error message must contain revert");
}
  
contract('SDAOTokenStaking', function(accounts) {

    var tokenStaking;
    var tokenAddress;
    var token;
     

    before(async () => 
        {
            tokenStaking = await SDAOTokenStaking.deployed();

            // set the SDAO token address in the Constructor
            //tokenAddress  = await tokenStaking.token.call();
            //token         = await Token.at(tokenAddress);

        });


    it ("Test Case - 1: Test Case Scenario", async function()
    {   

        const { value: currentValue_before } = await tokenStaking.getValue();

        // set the value
        let inputVal = 100;
        await tokenStaking.set(inputVal);

        const { value: currentValue_after} = await tokenStaking.getValue();

        assert.equal(currentValue_after.toNumber(), currentValue_before.toNumber() + inputVal);

    }); 

    it ("Test Case - 2: Test Case Scenario", async function()
    {   
        
        const { value: currentValue_before } = await tokenStaking.getValue();

        // set the value
        let inputVal = 500;
        await tokenStaking.set(inputVal);

        const { value: currentValue_after} = await tokenStaking.getValue();

        assert.equal(currentValue_after.toNumber(), currentValue_before.toNumber() + inputVal);
        
    });
          
});