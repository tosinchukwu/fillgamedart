// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title FillingGameScoreboard
 * @dev A contract to record verified Filling Game results using Chainlink Functions.
 */
contract FillingGameScoreboard is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    struct GameResult {
        address winner;
        string winnerName;
        uint256 score;
        uint256 timestamp;
        bool verified;
    }

    GameResult[] public history;
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    event ScoreRecorded(address indexed winner, string winnerName, uint256 score, uint256 timestamp, bool verified);
    event Response(bytes32 indexed requestId, bytes response, bytes err);

    constructor(address router) FunctionsClient(router) {}

    /**
     * @dev Sends a request to verify the game score off-chain using CRE.
     * @param source The source code for the Chainlink Function.
     * @param args The arguments (hit history JSON).
     */
    function sendVerificationRequest(
        string memory source,
        string[] memory args,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (args.length > 0) req.setArgs(args);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            callbackGasLimit,
            donId
        );
        return s_lastRequestId;
    }

    /**
     * @dev Callback function called by Chainlink Functions.
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        s_lastResponse = response;
        s_lastError = err;
        emit Response(requestId, response, err);

        if (err.length == 0) {
            // Logic to parse response and record the score would go here.
            // For now, we emit the result.
        }
    }

    /**
     * @dev Records a new game result on the blockchain.
     */
    function recordScore(string memory _winnerName, uint256 _score, bool _verified) public {
        GameResult memory newResult = GameResult({
            winner: msg.sender,
            winnerName: _winnerName,
            score: _score,
            timestamp: block.timestamp,
            verified: _verified
        });

        history.push(newResult);
        emit ScoreRecorded(msg.sender, _winnerName, _score, block.timestamp, _verified);
    }

    function getGameCount() public view returns (uint256) {
        return history.length;
    }
}
