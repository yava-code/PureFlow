// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RepRegistry} from "../src/RepRegistry.sol";

contract RepRegistryTest {
    RepRegistry private registry;

    function setUp() public {
        registry = new RepRegistry();
    }

    function testAttestStoresCommitmentAndCount() public {
        bytes32 commitment = keccak256("privacy-safe-summary");

        registry.attest(commitment, 1518, 4, 2, 3);

        require(registry.attestorOf(commitment) == address(this), "wrong attestor");
        require(registry.repCount(address(this)) == 1, "wrong count");
    }

    function testRejectsDuplicateCommitment() public {
        bytes32 commitment = keccak256("duplicate");
        registry.attest(commitment, 1500, 1, 1, 2);

        (bool ok,) = address(registry).call(
            abi.encodeCall(RepRegistry.attest, (commitment, 1500, 1, 1, 2))
        );

        require(!ok, "duplicate accepted");
    }

    function testRejectsInvalidOwnership() public {
        (bool ok,) = address(registry).call(
            abi.encodeCall(RepRegistry.attest, (keccak256("bad ownership"), 1500, 1, 1, 4))
        );

        require(!ok, "invalid ownership accepted");
    }

    function testRejectsEmptyCommitment() public {
        (bool ok,) = address(registry).call(
            abi.encodeCall(RepRegistry.attest, (bytes32(0), 1500, 1, 1, 2))
        );

        require(!ok, "empty commitment accepted");
    }
}

