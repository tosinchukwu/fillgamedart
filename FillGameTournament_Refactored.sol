// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract FillGameTournament is Ownable, ReentrancyGuard, Pausable {
    struct Match {
        uint256 id;
        address player1;
        string player1Name;
        address player2;
        string player2Name;
        bool player1Paid;
        bool player2Paid;
        address winner;
        string scoreline;
        bool isCompleted;
        bool isCancelled;
        uint256 prizePool;
        uint256 createdAt;
        bool isCasual;
    }

    uint256 public entryFee = 0.1 ether;
    uint256 public protocolFeeBps = 1000; // 10.00%
    uint256 public matchTimeout = 7 days;

    mapping(uint256 => Match) public matches;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event MatchCreated(uint256 indexed matchId, address creator, bool isCasual);
    event PlayerJoined(uint256 indexed matchId, address player, uint256 amount);
    event MatchCancelled(uint256 indexed matchId, address cancelledBy);
    event RefundClaimed(uint256 indexed matchId, address player, uint256 amount);
    event ResultSubmitted(
        uint256 indexed matchId,
        address indexed winner,
        string scoreline,
        uint256 prizeToWinner,
        uint256 protocolFee
    );
    event PrizeDistributed(uint256 indexed matchId, address indexed winner, uint256 amount);
    event ProtocolFeeCollected(uint256 indexed matchId, uint256 amount);

    // ──────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────

    error InvalidEntryFee();
    error MatchAlreadyExists();
    error InvalidParticipants();
    error NotParticipant();
    error AlreadyPaid();
    error MatchInactive();
    error CasualMatchNoFee();
    error ExactFeeRequired();
    error NotYetRefundable();
    error NothingToRefund();
    error OnlyOwnerForOfficial();
    error BothPlayersMustPay();
    error InvalidWinner();
    error ResultSubmissionTimedOut();
    error NoBalanceToWithdraw();

    constructor() Ownable(msg.sender) {}

    // ──────────────────────────────────────────────
    // Configuration
    // ──────────────────────────────────────────────

    function setEntryFee(uint256 _fee) external onlyOwner {
        if (_fee == 0) revert InvalidEntryFee();
        entryFee = _fee;
    }

    function setProtocolFeeBps(uint256 _bps) external onlyOwner {
        require(_bps <= 3000, "Max 30%");
        protocolFeeBps = _bps;
    }

    function setMatchTimeout(uint256 _seconds) external onlyOwner {
        require(_seconds >= 1 days && _seconds <= 30 days, "Timeout 1-30 days");
        matchTimeout = _seconds;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ──────────────────────────────────────────────
    // Match Creation
    // ──────────────────────────────────────────────

    /**
     * @dev Refactored to avoid "Stack too deep" by assigning directly to storage.
     */
    function createMatch(
        uint256 matchId,
        address _player1,
        string calldata _player1Name,
        address _player2,
        string calldata _player2Name,
        bool _isCasual
    ) external whenNotPaused {
        if (matches[matchId].id != 0) revert MatchAlreadyExists();
        if (_player1 == address(0) || _player2 == address(0) || _player1 == _player2) {
            revert InvalidParticipants();
        }

        if (!_isCasual && msg.sender != owner()) {
            revert OnlyOwnerForOfficial();
        }

        // Fix: Use storage reference and direct assignment to bypass the stack limit
        Match storage m = matches[matchId];
        m.id = matchId;
        m.player1 = _player1;
        m.player1Name = _player1Name;
        m.player2 = _player2;
        m.player2Name = _player2Name;
        m.player1Paid = false;
        m.player2Paid = false;
        m.winner = address(0);
        m.scoreline = "";
        m.isCompleted = false;
        m.isCancelled = false;
        m.prizePool = 0;
        m.createdAt = block.timestamp;
        m.isCasual = _isCasual;

        emit MatchCreated(matchId, msg.sender, _isCasual);
    }

    // ──────────────────────────────────────────────
    // Joining (only official matches)
    // ──────────────────────────────────────────────

    function joinMatch(uint256 matchId) external payable nonReentrant whenNotPaused {
        Match storage m = matches[matchId];
        if (m.id == 0) revert MatchInactive();
        if (m.isCompleted || m.isCancelled) revert MatchInactive();
        if (m.isCasual) revert CasualMatchNoFee();
        if (msg.value != entryFee) revert ExactFeeRequired();

        bool isPlayer1 = msg.sender == m.player1;
        bool isPlayer2 = msg.sender == m.player2;
        if (!isPlayer1 && !isPlayer2) revert NotParticipant();

        if (isPlayer1) {
            if (m.player1Paid) revert AlreadyPaid();
            m.player1Paid = true;
        } else {
            if (m.player2Paid) revert AlreadyPaid();
            m.player2Paid = true;
        }

        m.prizePool += msg.value;

        emit PlayerJoined(matchId, msg.sender, msg.value);
    }

    // ──────────────────────────────────────────────
    // Cancellation & Refund
    // ──────────────────────────────────────────────

    function cancelMatch(uint256 matchId) external whenNotPaused {
        Match storage m = matches[matchId];
        if (m.id == 0) revert MatchInactive();
        if (m.isCompleted) revert MatchInactive();
        if (m.isCancelled) return; // idempotent

        bool isAuthorized = msg.sender == m.player1 || msg.sender == m.player2 || msg.sender == owner();
        if (!isAuthorized) revert NotParticipant();

        m.isCancelled = true;
        emit MatchCancelled(matchId, msg.sender);
    }

    function claimRefund(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.id == 0) revert MatchInactive();
        if (m.isCompleted) revert MatchInactive();
        if (m.isCasual) revert CasualMatchNoFee();

        bool canRefund = m.isCancelled || (block.timestamp >= m.createdAt + matchTimeout);
        if (!canRefund) revert NotYetRefundable();

        bool isPlayer1 = msg.sender == m.player1;
        bool isPlayer2 = msg.sender == m.player2;
        if (!isPlayer1 && !isPlayer2) revert NotParticipant();

        uint256 amount = 0;
        if (isPlayer1 && m.player1Paid) {
            amount = entryFee;
            m.player1Paid = false;
        } else if (isPlayer2 && m.player2Paid) {
            amount = entryFee;
            m.player2Paid = false;
        }

        if (amount == 0) revert NothingToRefund();

        m.prizePool -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund failed");

        emit RefundClaimed(matchId, msg.sender, amount);
    }

    // ──────────────────────────────────────────────
    // Result Submission (only official, time-bound)
    // ──────────────────────────────────────────────

    function submitResult(
        uint256 matchId,
        address winnerAddr,
        string calldata scoreline
    ) external onlyOwner nonReentrant whenNotPaused {
        Match storage m = matches[matchId];
        if (m.id == 0) revert MatchInactive();
        if (m.isCasual) revert CasualMatchNoFee();
        if (m.isCompleted || m.isCancelled) revert MatchInactive();
        if (!m.player1Paid || !m.player2Paid) revert BothPlayersMustPay();
        if (block.timestamp > m.createdAt + matchTimeout) revert ResultSubmissionTimedOut();
        if (winnerAddr != m.player1 && winnerAddr != m.player2) revert InvalidWinner();

        m.winner = winnerAddr;
        m.scoreline = scoreline;
        m.isCompleted = true;

        uint256 protocolFee = (m.prizePool * protocolFeeBps) / 10000;
        uint256 prize = m.prizePool - protocolFee;

        if (prize > 0) {
            (bool ok,) = winnerAddr.call{value: prize}("");
            require(ok, "Prize transfer failed");
            emit PrizeDistributed(matchId, winnerAddr, prize);
        }

        if (protocolFee > 0) {
            (bool ok,) = owner().call{value: protocolFee}("");
            require(ok, "Fee transfer failed");
            emit ProtocolFeeCollected(matchId, protocolFee);
        }

        emit ResultSubmitted(matchId, winnerAddr, scoreline, prize, protocolFee);
    }

    // ──────────────────────────────────────────────
    // Emergency (safer version – only protocol fees, not player funds)
    // ──────────────────────────────────────────────

    function withdrawProtocolFees() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) revert NoBalanceToWithdraw();

        (bool success, ) = owner().call{value: bal}("");
        require(success, "Withdraw failed");
    }

    // ──────────────────────────────────────────────
    // Views
    // ──────────────────────────────────────────────

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    receive() external payable {}
}
