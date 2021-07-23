let Contract = require("@truffle/contract");
let SDAOTokenStaking = artifacts.require("./SDAOTokenStaking.sol");


let TokenAbi = require("../SDAOTokenArtifacts/abi/SDAOToken.json");
let TokenNetworks = require("../SDAOTokenArtifacts/networks/SDAOToken.json");
let TokenBytecode = require("../SDAOTokenArtifacts/bytecode/SDAOToken.json");
let Token = Contract({contractName: "SingularityDAO", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});

// Token Contract Constants
const name = "SingularityDAO Token"
const symbol = "SDAO"

module.exports = function(deployer, network, accounts) {

    //deployer.deploy(SDAOTokenStaking,"0x5e94577b949a56279637ff74dfcff2c28408f049");

    Token.setProvider(web3.currentProvider)
    Token.defaults({from: accounts[0], gas: 4000000});

    // AirDrop Contract deployment 
    deployer.deploy(Token, accounts[0], {overwrite: false, gas: 4000000}).then((TokenInstance) => deployer.deploy(SDAOTokenStaking, TokenInstance.address));

};
