import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiProvider } from 'wagmi'
import { avalanche } from 'viem/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import { WALLET_CONNECT_PROJECT_ID } from '../lib/constants'

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = WALLET_CONNECT_PROJECT_ID

// 2. Create wagmiConfig
const metadata = {
    name: 'Filling Game',
    description: 'Filling Game on Avalanche',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [avalanche] as const
const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
})

// 3. Create modal
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true,
    enableOnramp: true
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
