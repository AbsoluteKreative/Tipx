// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../ContributionVault.sol";

contract DeployVault is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PLATFORM_WALLET_PRIVATE_KEY");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");
        address operatorAddr = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        ContributionVault vault = new ContributionVault(usdcAddr, operatorAddr);
        vm.stopBroadcast();

        console.log("ContributionVault:", address(vault));
        console.log("operator:", operatorAddr);
        console.log("USDC:", usdcAddr);
    }
}
