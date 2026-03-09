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

    // Request context to record history on fulfillment
    struct RequestContext {
        address requester;
        string winnerName;
    }

    GameResult[] public history;
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    mapping(bytes32 => RequestContext) public s_requestContexts;

    event ScoreRecorded(address indexed winner, string winnerName, uint256 score, uint256 timestamp, bool verified);
    event Response(bytes32 indexed requestId, bytes response, bytes err);

    constructor(address router) FunctionsClient(router) {}

    /**
     * @dev Sends a request to verify the game score off-chain using CRE.
     * @param source The source code for the Chainlink Function.
     * @param args The arguments (hit history JSON).
     * @param winnerName The name of the winner to record if verification succeeds.
     */
    function sendVerificationRequest(
        string memory source,
        string[] memory args,
        string memory winnerName,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (args.length > 0) req.setArgs(args);
        
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            callbackGasLimit,
            donId
        );

        s_lastRequestId = requestId;
        s_requestContexts[requestId] = RequestContext({
            requester: msg.sender,
            winnerName: winnerName
        });

        return requestId;
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

        if (err.length == 0 && response.length == 32) {
            // Decode packed uint256 response:
            // [248-255]: winnerIdx (8 bits)
            // [128-159]: score0 * 10 (32 bits)
            // [0-31]: score1 * 10 (32 bits)
            uint256 packed = abi.decode(response, (uint256));
            
            uint8 winnerIdx = uint8(packed >> 248);
            uint256 s0 = (uint256(packed >> 128) & 0xFFFFFFFF);
            uint256 s1 = (uint256(packed) & 0xFFFFFFFF);

            RequestContext memory ctx = s_requestContexts[requestId];
            if (ctx.requester != address(0)) {
                uint256 winningScore = (winnerIdx == 0) ? s0 : (winnerIdx == 1 ? s1 : 0);
                // Convert back from *10 fixed point if desired, but here we store as is or divide
                recordScoreInternal(ctx.requester, ctx.winnerName, winningScore / 10, true);
                delete s_requestContexts[requestId];
            }
        }
    }

    /**
     * @dev Records a new game result on the blockchain.
     */
    function recordScore(string memory _winnerName, uint256 _score, bool _verified) public {
        recordScoreInternal(msg.sender, _winnerName, _score, _verified);
    }

    function recordScoreInternal(address _winner, string memory _winnerName, uint256 _score, bool _verified) internal {
        GameResult memory newResult = GameResult({
            winner: _winner,
            winnerName: _winnerName,
            score: _score,
            timestamp: block.timestamp,
            verified: _verified
        });

        history.push(newResult);
        emit ScoreRecorded(_winner, _winnerName, _score, block.timestamp, _verified);
    }

    function getGameCount() public view returns (uint256) {
        return history.length;
    }
}
