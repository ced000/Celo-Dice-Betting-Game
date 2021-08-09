// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract DiceBettingGame {
    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    event Game(
        uint256  userGuess,
        uint256 dieRollValue
    );

    function randomMod(uint mod) public view returns(uint256){
        // insecure method of random number generation
        // would change to chainlink
        // when available on the Celo chain
        return (uint256(keccak256(abi.encodePacked(block.timestamp,  msg.sender))) % mod) + 1;
    }
     
    
    function playGame(uint256 guessValue, uint256 stakeAmount) public payable returns(uint256 result) {
        require(IERC20Token(cUsdTokenAddress).balanceOf(address(this)) > stakeAmount, "Insufficient Vault Balance");
        
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                address(this),
                stakeAmount
            ),
            "Insufficient Funds"
        ); 
         
        uint256 dieRollResult = randomMod(6);
        
        // if user guessed right, send them double Their stake else they loose their stake.
        if(dieRollResult == guessValue){
            IERC20Token(cUsdTokenAddress).transfer(
                msg.sender,
                stakeAmount * 2
            );
        }
        
        emit Game(guessValue, dieRollResult);
        return dieRollResult;
    }
    
    // These updated end of the contract lets you fund contract in the case of Insufficient balance.
    // a modifier is used instead of a direct require function, just in case you decide to change the conditions to 
    // a more decentralized liquidity provision method. 
    modifier onlyOwner () {
        require (msg.sender == tx.origin);
        _;
    }
    
    // call this function with some cUSD to fund contract. 
    function fundContract() public payable onlyOwner {
        
    }
    
    function getContractBal() public returns(uint256) {
        return address(this).balance;
    }
} 
