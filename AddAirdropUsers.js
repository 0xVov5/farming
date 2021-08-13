require("dotenv").config()
Web3 = require("web3");


//const userRewards =require('./eligible_claim2/001-addAddresses_add.json');
const usersAirdrop =require('');
//const rewards ='./rewards.json';


const SingDaoBondedStakingABI = require('./build/contracts/SDAOBondedTokenStake.json')

const PORT = process.env.PORT || 5001


//Commander import
const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');


console.log(`Running on mainnet ........`);
networkId = "1"; //"42";  //"97"; //
ETH_NODE_URL= 'https://mainnet.infura.io/v3/'+process.env.InfuraKey;
     

var web3 = new Web3(ETH_NODE_URL);


let minABI = [
  {
    "constant":true,
    "inputs":[{"name":"_owner","type":"address"}],
    "name":"balanceOf",
    "outputs":[{"name":"balance","type":"uint256"}],
    "type":"function"
  },
  // decimals
  {
    "constant":true,
    "inputs":[],
    "name":"decimals",
    "outputs":[{"name":"","type":"uint8"}],
    "type":"function"
  }, 
  {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
];



 async function  AddAdddresesSDAO(){


   const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY); //process.env.PRIVATE_KEY_KOVAN
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    console.log(account.address)

    var SingDaoBondedStaking = new web3.eth.Contract(SingDaoBondedStakingABI.abi, process.env.BONDED_STAKING_CONTRACT);
//    var SingDaoToken = new web3.eth.Contract(minABI, process.env.SINGDAO_TOKEN_CONTRACT);


    try {


        var AddAirdropClaimer = await SingDaoAirdrop.methods.airDropStakes("0",usersAirdrop.addresses,usersAirdrop.rewards).send({
           'from': account.address,
           'gas': 2500000,
           'gasPrice': 14000000000,
        }, function(error, data){
          console.log(error);
          //console.log(data)
          console.log("Transaction ID init : " .cyan + data)
          console.log("check transaction at https://etherscan.io/tx/"+data)
        });


    } catch(error){

     console.log(error);

   }
}

AddAdddresesSDAO();