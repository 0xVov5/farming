let SDAOTokenStaking = artifacts.require("./SDAOTokenStaking.sol");
let Contract = require("@truffle/contract");

// Need to update the same once the SDAO Token artifacts are deployed as an npm package
//let TokenAbi = require("singularitydao-token-contracts/abi/SingularityDAOToken.json");
//let TokenNetworks = require("singularitydao-token-contracts/networks/SingularityDAOToken.json");
//let TokenBytecode = require("singularitydao-token-contracts/bytecode/SingularityDAOToken.json");
//let Token = Contract({contractName: "SDAO", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});

// Token Contract Constants
const name = "SingularityDAO"
const symbol = "SDAO"

module.exports = function(deployer, network, accounts) {

    //Token.setProvider(web3.currentProvider)
    //Token.defaults({from: accounts[0], gas: 4000000});

    // Update the following code for automatic addition of the SDAO Contract through the constructor
    //deployer.deploy(Token, {overwrite: false, gas: 4000000}).then((TokenInstance) => deployer.deploy(SDAOTokenStaking, TokenInstance.address));

    deployer.deploy(SDAOTokenStaking);

};
