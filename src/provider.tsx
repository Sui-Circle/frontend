
import React from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { networkConfig, network } from "./contract/index.js";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  console.log('Providers: Initializing with network config', { networkConfig, network });
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
          <WalletProvider autoConnect={true}>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('Providers: Error initializing providers', error);
    return <div>Error initializing providers: {error instanceof Error ? error.message : 'Unknown error'}</div>;
  }
}
