// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Public commitments to privacy-safe PureFlow Rep summaries.
contract RepRegistry {
    error EmptyCommitment();
    error AlreadyAttested();
    error InvalidDuration();
    error InvalidOwnership();

    event RepAttested(
        address indexed developer,
        bytes32 indexed commitment,
        uint32 focusedSeconds,
        uint16 testRuns,
        uint16 debugLoops,
        uint8 ownership,
        uint64 completedAt
    );

    mapping(bytes32 commitment => address developer) public attestorOf;
    mapping(address developer => uint64 count) public repCount;

    function attest(
        bytes32 commitment,
        uint32 focusedSeconds,
        uint16 testRuns,
        uint16 debugLoops,
        uint8 ownership
    ) external {
        if (commitment == bytes32(0)) revert EmptyCommitment();
        if (attestorOf[commitment] != address(0)) revert AlreadyAttested();
        if (focusedSeconds == 0 || focusedSeconds > 24 hours) revert InvalidDuration();
        if (ownership < 1 || ownership > 3) revert InvalidOwnership();

        attestorOf[commitment] = msg.sender;
        repCount[msg.sender]++;

        emit RepAttested(
            msg.sender,
            commitment,
            focusedSeconds,
            testRuns,
            debugLoops,
            ownership,
            uint64(block.timestamp)
        );
    }
}

