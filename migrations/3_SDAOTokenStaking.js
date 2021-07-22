let Contract = require("@truffle/contract");
let SDAOTokenStaking = artifacts.require("./SDAOTokenStaking.sol");


// Need to update the same once the SDAO Token artifacts are deployed as an npm package
//let TokenAbi = require("singularitydao-token-contracts/abi/SingularityDAOToken.json");
//let TokenNetworks = require("singularitydao-token-contracts/networks/SingularityDAOToken.json");
//let TokenBytecode = require("singularitydao-token-contracts/bytecode/SingularityDAOToken.json");
//let Token = Contract({contractName: "SDAO", abi: TokenAbi, networks: TokenNetworks, bytecode: TokenBytecode});


module.exports = function(deployer, network, accounts) {


    deployer.deploy(SDAOTokenStaking,"0x5e94577b949a56279637ff74dfcff2c28408f049");

};
