export const CONTRACT_ADDRESS = '0x306beA249FF7ee1057a5A0a5a17f108F5a1C7DF8';


export const WALLET_CONNECT_PROJECT_ID = 'df9103b089fad4ac16226c9ea96a15aa'; // Get from https://cloud.walletconnect.com

export const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "AlreadyPaid",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "BothPlayersMustPay",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "CasualMatchNoFee",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EnforcedPause",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ExactFeeRequired",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ExpectedPause",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidEntryFee",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidParticipants",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidWinner",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "MatchAlreadyExists",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "MatchInactive",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NoBalanceToWithdraw",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotParticipant",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotYetRefundable",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NothingToRefund",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyOwnerForOfficial",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ReentrancyGuardReentrantCall",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ResultSubmissionTimedOut",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "cancelledBy",
                "type": "address"
            }
        ],
        "name": "MatchCancelled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "creator",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "isCasual",
                "type": "bool"
            }
        ],
        "name": "MatchCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "Paused",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "player",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "PlayerJoined",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "PrizeDistributed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "ProtocolFeeCollected",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "player",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "RefundClaimed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "scoreline",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "prizeToWinner",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "protocolFee",
                "type": "uint256"
            }
        ],
        "name": "ResultSubmitted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "Unpaused",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "VictoryNFTMinted",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            }
        ],
        "name": "cancelMatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            }
        ],
        "name": "claimRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_player1",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_player1Name",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "_player2",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_player2Name",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "_isCasual",
                "type": "bool"
            }
        ],
        "name": "createMatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "entryFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            }
        ],
        "name": "getMatch",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "player1",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "player1Name",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "player2",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "player2Name",
                        "type": "string"
                    },
                    {
                        "internalType": "bool",
                        "name": "player1Paid",
                        "type": "bool"
                    },
                    {
                        "internalType": "bool",
                        "name": "player2Paid",
                        "type": "bool"
                    },
                    {
                        "internalType": "address",
                        "name": "winner",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "scoreline",
                        "type": "string"
                    },
                    {
                        "internalType": "bool",
                        "name": "isCompleted",
                        "type": "bool"
                    },
                    {
                        "internalType": "bool",
                        "name": "isCancelled",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "prizePool",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "createdAt",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "isCasual",
                        "type": "bool"
                    }
                ],
                "internalType": "struct FillGameTournament.Match",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            }
        ],
        "name": "joinMatch",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "matchTimeout",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "matches",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "player1",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "player1Name",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "player2",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "player2Name",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "player1Paid",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "player2Paid",
                "type": "bool"
            },
            {
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "scoreline",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "isCompleted",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "isCancelled",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "prizePool",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "createdAt",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "isCasual",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nftContract",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pause",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "paused",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "protocolFeeBps",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_fee",
                "type": "uint256"
            }
        ],
        "name": "setEntryFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_seconds",
                "type": "uint256"
            }
        ],
        "name": "setMatchTimeout",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_nft",
                "type": "address"
            }
        ],
        "name": "setNftContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_bps",
                "type": "uint256"
            }
        ],
        "name": "setProtocolFeeBps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "matchId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "winnerAddr",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "scoreline",
                "type": "string"
            }
        ],
        "name": "submitResult",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "unpause",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdrawProtocolFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
] as const;

export const VERIFIER_CONTRACT_ADDRESS = '0xf3fa437B722441301c8ec041D4e2dd704869e995';
export const CHAINLINK_SUBSCRIPTION_ID = 15791;

export const VERIFIER_CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "router",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "EmptyArgs",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EmptySource",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NoInlineSecrets",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyRouterCanFulfill",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            }
        ],
        "name": "RequestFulfilled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            }
        ],
        "name": "RequestSent",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "requestId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "response",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "err",
                "type": "bytes"
            }
        ],
        "name": "Response",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "winnerName",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "score",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "verified",
                "type": "bool"
            }
        ],
        "name": "ScoreRecorded",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getGameCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "requestId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "response",
                "type": "bytes"
            },
            {
                "internalType": "bytes",
                "name": "err",
                "type": "bytes"
            }
        ],
        "name": "handleOracleFulfillment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "history",
        "outputs": [
            {
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "winnerName",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "score",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "verified",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_winnerName",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_score",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "_verified",
                "type": "bool"
            }
        ],
        "name": "recordScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "s_lastError",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "s_lastRequestId",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "s_lastResponse",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "s_requestContexts",
        "outputs": [
            {
                "internalType": "address",
                "name": "requester",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "winnerName",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "source",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "args",
                "type": "string[]"
            },
            {
                "internalType": "string",
                "name": "winnerName",
                "type": "string"
            },
            {
                "internalType": "uint64",
                "name": "subscriptionId",
                "type": "uint64"
            },
            {
                "internalType": "uint32",
                "name": "callbackGasLimit",
                "type": "uint32"
            },
            {
                "internalType": "bytes32",
                "name": "donId",
                "type": "bytes32"
            }
        ],
        "name": "sendVerificationRequest",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "requestId",
                "type": "bytes32"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
