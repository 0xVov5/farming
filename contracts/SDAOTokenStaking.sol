pragma solidity ^0.6.0;

//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract SDAOTokenStaking {
    
    using SafeMath for uint256;
    
    // ERC20 public token; // Address of token contract

    uint256 testVar;

    // Events
    event Set(address indexed sender, uint256 value);

    // Modifiers

    //constructor (address _token)
    //public
    //{
    //    token = ERC20(_token);
    //}


    function set(uint256 value) 
    public
    returns(bool) 
    {
        require(value > 0 , "Invalid inuput."); 

        testVar = testVar.add(value);

        emit Set(msg.sender, value);

        return true;
    }

    function getValue() public view returns(bool found, uint256 value)
    {
        found = true;
        value = testVar;
    }


}