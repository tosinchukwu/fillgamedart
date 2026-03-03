export const CONTRACT_ADDRESS = '0xce59A14d890991Dd973Bbc5b3509A36522ebbD8D'; // Replace with your contract address

export const WALLET_CONNECT_PROJECT_ID = 'df9103b089fad4ac16226c9ea96a15aa'; // Get from https://cloud.walletconnect.com

export const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "p1Name", "type": "string" },
            { "internalType": "address", "name": "p1Addr", "type": "address" },
            { "internalType": "uint256", "name": "p1Score", "type": "uint256" },
            { "internalType": "string", "name": "p2Name", "type": "string" },
            { "internalType": "address", "name": "p2Addr", "type": "address" },
            { "internalType": "uint256", "name": "p2Score", "type": "uint256" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "recordScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
