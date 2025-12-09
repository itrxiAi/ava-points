'use client'

import { useEffect } from 'react'
import Theme from '../theme-provider'
import AOS from 'aos'
import 'aos/dist/aos.css'
import Header from '@/components/ui/header'
import BottomNav from '@/components/ui/bottom-nav'
import { WalletRefProvider } from '@/components/ui/wallet-ref'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/config/wagmi' // Initialize Reown AppKit configuration

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    AOS.init({
      once: true,
      disable: 'phone',
      duration: 600,
      easing: 'ease-out-sine',
    })
  })

  // Create a client for React Query
  const queryClient = new QueryClient()

  return (
    <Theme>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <WalletRefProvider>
            <div className="flex flex-col min-h-screen overflow-hidden bg-black">
              <Header />
              <main className="grow">
                {children}
              </main>
              <BottomNav />
            </div>
          </WalletRefProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Theme>
  )
}
