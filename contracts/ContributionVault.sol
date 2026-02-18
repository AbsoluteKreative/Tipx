// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ContributionVault {
    address public operator;
    IERC20 public immutable usdc;

    event ContributionReceived(
        address indexed patron,
        address indexed creator,
        uint256 amount,
        uint256 creatorShare,
        uint256 protocolFee,
        uint256 timestamp
    );

    event LoyaltyDistributed(
        address indexed patron,
        address indexed creator,
        uint256 cashbackAmount,
        uint256 bonusAmount,
        uint256 timestamp
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "only operator");
        _;
    }

    constructor(address _usdc, address _operator) {
        usdc = IERC20(_usdc);
        operator = _operator;
    }

    /// @notice contribute to a creator. caller must approve this contract for `amount` USDC first.
    /// splits 95% to creator, 5% to vault (protocol fee).
    function contribute(address creator, uint256 amount) external {
        require(creator != address(0), "invalid creator");
        require(amount > 0, "zero amount");

        uint256 protocolFee = (amount * 5) / 100;
        uint256 creatorShare = amount - protocolFee;

        require(usdc.transferFrom(msg.sender, creator, creatorShare), "creator transfer failed");
        require(usdc.transferFrom(msg.sender, address(this), protocolFee), "protocol fee transfer failed");

        emit ContributionReceived(msg.sender, creator, amount, creatorShare, protocolFee, block.timestamp);
    }

    /// @notice distribute loyalty payouts from the fee pool. operator only.
    function distributeLoyalty(
        address patron,
        address creator,
        uint256 cashbackAmount,
        uint256 bonusAmount
    ) external onlyOperator {
        require(patron != address(0) && creator != address(0), "invalid address");

        if (cashbackAmount > 0) {
            require(usdc.transfer(patron, cashbackAmount), "cashback transfer failed");
        }
        if (bonusAmount > 0) {
            require(usdc.transfer(creator, bonusAmount), "bonus transfer failed");
        }

        emit LoyaltyDistributed(patron, creator, cashbackAmount, bonusAmount, block.timestamp);
    }

    /// @notice withdraw accumulated fees. operator only.
    function withdraw(uint256 amount) external onlyOperator {
        require(usdc.transfer(operator, amount), "withdraw failed");
    }

    /// @notice transfer operator role. operator only.
    function transferOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "invalid address");
        operator = newOperator;
    }

    /// @notice check vault's USDC balance (protocol fee pool).
    function vaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
