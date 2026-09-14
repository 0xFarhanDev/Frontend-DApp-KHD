import { create } from 'zustand';

interface DappState {
    walletAddress: string;
    ethBalance: string;
    khdBalance: string;
    stakeBalance: string;

    setWalletAddress: (address: string) => void;
    setBalances: (eth: string, khd: string, stake: string) => void;
}

export const useDappStore = create<DappState>((set) => ({
    walletAddress: "",
    ethBalance: "0",
    khdBalance: "0",
    stakeBalance: "0",

    setWalletAddress: (address) => set({ walletAddress: address }),
    setBalances: (eth, khd, staked) => set({
        ethBalance: eth,
        khdBalance: khd,
        stakeBalance: staked
    }),    
}));