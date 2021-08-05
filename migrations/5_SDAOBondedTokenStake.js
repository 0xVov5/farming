let Contract = require("@truffle/contract");
let SDAOBondedTokenStake = artifacts.require("./SDAOBondedTokenStake.sol");


let TokenAbi = require("singularitydao-token-contracts/abi/SDAOToken.json");
let TokenNetworks = require("singularitydao-token-contracts/networks/SDAOToken.json");
let TokenBytecode = require("singularitydao-token-contracts/bytecode/SDAOToken.json");
let Token = Contract({contractName: "SingularityDAO", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});

// Token Contract Constants
const name = "SingularityDAO Token"
const symbol = "SDAO"

// Keeping air drop auto stake for 10 Days from the day of Contact deployment and 15Sec as Average Block time
const maxAirDropStakeBlocks = (10 * 24 * 60 * 60) / 15;

module.exports = function(deployer, network, accounts) {

    Token.setProvider(web3.currentProvider)
    Token.defaults({from: accounts[0], gas: 4000000});

    // SDAOBondedTokenStake Contract deployment 
    deployer.deploy(Token, accounts[0], {overwrite: false, gas: 4000000}).then((TokenInstance) => deployer.deploy(SDAOBondedTokenStake, TokenInstance.address, maxAirDropStakeBlocks));

};
