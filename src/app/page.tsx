"use client";

import { useEffect } from "react";
import { useState } from "react";
import { BrowserProvider, Contract, formatEther, parseUnits, ethers } from "ethers";
import { KHD_ADDRESS, KHD_ABI, STAKING_ADDRESS, STAKING_ABI } from "./constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWatchContractEvent } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useDappStore } from '../store/useDappStore';
import AdminPanel from "./AdminPanel";
import { time } from "console";

type EthereumProvider = {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ContractError = Error & {
  reason?: string;
  shortMessage?: string;
  code?: string;
  message?: string;
};

const getEthereum = (): EthereumProvider | null => {
  if (typeof window === "undefined") return null;
  const win = window as Window & { ethereum?: EthereumProvider };
  return win.ethereum ?? null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const contractError = error as ContractError;
    return contractError.reason ?? contractError.shortMessage ?? contractError.message ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
};

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [khdBalance, setKhdBalance] = useState("");
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakedBalance, setStakedBalance] = useState("0");

  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [isUnStake, setIsUnStake] = useState(false);
  const [isBalance, setIsBalance] = useState(false);
 
  const [unlockTime, setUnlockTime] = useState(0);
  const [nextClaimTime, setNextClaimtime] = useState<number>(0);
  const [claimTimeLeft, setClaimTimeLeft] = useState<number>(0);
  const [unlockTimeLeft, setUnlockTimeLeft] = useState<number>(0);
  const [liveReward, setLiveReward] = useState<number>(0);
  const [globalStaked, setGlobalStaked] = useState("0");
  const [txHistory, setTxHistory] = useState<{user: string, amount: string}[]>([]);

  const { address } = useAccount();
  const setBalances = useDappStore((state) => state.setBalances);


  const fetchBalances = async (address: string) => {
  if (!address)
    return;
  const ethereum = getEthereum()
  if (typeof window === "undefined" || !ethereum) return;

  try {
    const ethereum = getEthereum();
    if(!ethereum) 
      return;

    const provider = new BrowserProvider(ethereum as never);

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 84532) {
      console.log("Lagi salah jaringan, Skip narik saldo dulu.");
      toast.error("Yeee Malah pindah jaringan Bleguugg!!");
      setBalances("0", "0", "0");
      return;

    }
    const rawEth = await provider.getBalance(address);
    const khdContract = new Contract(KHD_ADDRESS, KHD_ABI, provider);
    const rawKhd = await khdContract.balanceOf(address);

    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, provider);
    const rawStaked = await stakingContract.stakedBalances(address);

    const lastClaimRaw = await stakingContract.lastClaimTimestamp(address);
    const nextTime = Number(lastClaimRaw) + 60;
    setNextClaimtime(nextTime);

    const rawTimestamp = await stakingContract.stakeTimestamp(address);
    const lockDuration = 60;
    if (Number(rawStaked) > 0 && Number(rawTimestamp) > 0) {
      setUnlockTime(Number(rawTimestamp) + lockDuration);
    } else {
      setUnlockTime(0);
    }
    const rawGlobalStaked = await khdContract.balanceOf(STAKING_ADDRESS);
  
     const formattedEth = ethers.formatEther(rawEth);
     const formattedKhd = ethers.formatEther(rawKhd);
     const formattedStaked = ethers.formatEther(rawStaked);
     const formattedGlobalStaked = ethers.formatEther(rawGlobalStaked);

     const rewardCalculated = (Number(formattedStaked) * 10) / 100;
     setLiveReward(rewardCalculated);
    
     console.log(" Saldo Staking di Tarik Dari Jaringan:", formattedStaked);
     toast.dismiss("home-toast");

    setBalance(formattedEth);
    setKhdBalance(formattedKhd);
    setStakedBalance(formattedStaked);
    setGlobalStaked(formattedGlobalStaked);
    setBalances(formattedEth, formattedKhd, formattedStaked);
  } catch (error: unknown) {
    console.error("Gagal mengambil saldo:", error);
    toast.dismiss("home-toast");
    toast.error("Salah Jaringan Blegug");
  } finally {
    setIsBalance(false);
  }
};
  const fetchTransactionHistory = async() => {
    try {
      const ethereum = getEthereum();
      if(!ethereum) return;

      const provider = new BrowserProvider(ethereum as never);
      const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, provider);

      const filter = stakingContract.filters.Staked();

      const logs = await stakingContract.queryFilter(filter, -5000);

      const historyData = logs.map((log: any) => {
        return {
          user: log.args[0],
          amount: ethers.formatEther(log.args[1])
        };
      }); 
      setTxHistory(historyData.reverse().slice(0, 5));
    } catch (error: unknown) {
      console.log("Gagal Narik Data History", error);
    }
  };

  useEffect(() => {
    if (address) {
      fetchBalances(address as string);
      fetchTransactionHistory();
    }
  }, [address]);
  useEffect(() => {
    console.log("UnLock time saat ini:", unlockTime);
    if (unlockTime === 0) {
      setUnlockTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = unlockTime - now;
        setUnlockTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return() => clearInterval(interval);
  }, [unlockTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = nextClaimTime - now;
      
      setClaimTimeLeft(remaining > 0 ? remaining : 0 );
    }, 1000)
    return() => clearInterval(interval);
  }, [nextClaimTime]);


  const TARGET_CHAIN_ID = '0x14a34';

  const checkAndSwitchNetwork = async () => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    try {
      const currentChainId = await ethereum.request({ method: 'eth_chainId'});
      if (currentChainId === TARGET_CHAIN_ID) return true;

      toast.loading("Pindah Jaringan dulu Ke Base Sepolia bro..", {id: "network-toast"});
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID}],
      });
      toast.dismiss("network-toast");
      toast.success("Cakeepp, Jaringan nya sesuai nih");
      return true;
    } catch (error: any) {
      toast.dismiss("toast-network");

      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: TARGET_CHAIN_ID,
                chainName: 'Base Sepolia Testnet',
                rpcUrls: ['https://sepolia.base.org'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                blockExpolererUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
          return true;
        } catch (addError) {
          toast.error("Gagal Nambahin Base Sepolia Bro..");
          return false;
        }
      }
      toast.error("Lu Batal Nambahin Jaringan ya?? BLAEN SPOT");
      return false;
    }
  };

 useWatchContractEvent({
   address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    eventName: 'Staked',
    syncConnectedChain: true,
    onLogs(Logs) {
      console.log('Transaksi Stake Masuk!!', Logs);
      toast.success("Stake Berhasil! Saldo otomatis reflesh.");

    if (address) fetchBalances(address as string);
  },
});
 useWatchContractEvent({
  address: STAKING_ADDRESS,
  abi: STAKING_ABI,
  eventName: 'RewardClaimed',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Transaksi Berhasill,Saldo Pasti di Claim kok tenaang', Logs);
    toast.success("Claim Berhasill Bro");

    if (address) fetchBalances(address as string);
  },
 });
useWatchContractEvent({
  address: STAKING_ADDRESS as `0x${string}`,
  abi: STAKING_ABI,
  eventName: 'Withdrawn',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Withdraw Masuukk..', Logs);
    toast.success("Penarikan Berhasil!! Saldo otomatis Masook");

    if (address) fetchBalances(address as string);
  },
});
useWatchContractEvent({
  address: STAKING_ADDRESS as `0x${string}`,
  abi: STAKING_ABI,
  eventName: 'Compounded',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Cie yang lagi ngompound, Masuukk..', Logs);
    toast.success("Compoud Berhasil!! Saldo otomatis Masook");

    if (address) fetchBalances(address as string);
    
  },
});
useWatchContractEvent({
  address: KHD_ADDRESS,
  abi: KHD_ABI,     
  eventName: 'Transfer',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Ada Koin Kehed Masuk Bre..', Logs);
    toast.success("Lu Nerima Koin KHD Broo");

    if (address) fetchBalances(address as string);
  },
});

 const connectWallet = async () => {
  const ethereum = getEthereum();

  if (!ethereum) {
    toast.error("MetaMask belum terinstall!");
    return;
  }

  try {
    const provider = new BrowserProvider(ethereum as never);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setWalletAddress(address);

    fetchBalances(address);
  } catch (error: unknown) {
    console.error(error);
  }
};

const handleStake = async () => {
  const isNetworkCorrect = await checkAndSwitchNetwork();
  if (!isNetworkCorrect) return;

  const normalizedStakeAmount = stakeAmount.trim();
  if (isStaking) return;
  setIsStaking(true);

  try {
    const ethereum = getEthereum();
    if (!ethereum) {
      toast.error("MetaMask belum terinstall!");
      return;
    }

    const provider = new BrowserProvider(ethereum as never);
    const signer = await provider.getSigner();
    const amountToStake = parseUnits(normalizedStakeAmount, 18);
    const khdContract = new Contract(KHD_ADDRESS, KHD_ABI, signer);
    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);

    toast.loading("Lagi Minta Izin (Approve) koin Khd...", { id: "stake-toast"});
    const txApprove = await khdContract.approve(STAKING_ADDRESS, amountToStake);
    await txApprove.wait();

    toast.loading( "Transaksi lagi di prosess...wait ya...", { id: "stake-toast" });
    const txStake = await stakingContract.stake(amountToStake);
    await txStake.wait();

    toast.dismiss("stake-toast");
    toast.success("Mantaap bro, Koin lu udah masuk staking!!!");

    setStakeAmount("");

    setTimeout(() => fetchBalances(address as string), 2000);
    setTimeout(() => fetchBalances(address as string), 5000);

  } catch (error: unknown) {
    console.error("Gagal melakukan stake:", error);
    toast.dismiss("stake-toast");
    toast.error(`Gagal stake! ${getErrorMessage(error)}`);
  } finally {
    setIsStaking(false);
  }
};

const handleClaim = async () => {
  setIsClaiming(true);
  try {
    if (!stakedBalance || Number(stakedBalance) <= 0) {
      toast.error("Belum ada KHD yang di-stake, jadi belum ada rewards yang bisa di-claim.");
      return;
    }

    const ethereum = getEthereum();
    if (!ethereum) {
      toast.error("MetaMask belum terinstall!");
      return;
    }

    const provider = new BrowserProvider(ethereum as never);
    const signer = await provider.getSigner();
    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    
    toast.loading("Tunggu yaa Reward nya lagi di prosses", { id: "claim-toast"});
   
    const tx = await stakingContract.claimReward();
    await tx.wait();
    
    toast.dismiss("claim-toast");
    toast.success("Claim rewards berhasil, Saldo bakal di-refresh!");

    setTimeout(() => fetchBalances(address as string), 2000);
    setTimeout(() => fetchBalances(address as string), 5000);
  } catch (error: unknown) {

    toast.dismiss("claim-toast");

    const reason = getErrorMessage(error);
    const err = error as ContractError;
    if (err.code !== "CALL_EXCEPTION" && err.code !== "ACTION_REJECTED") {
      console.error("Gagal melakukan claim rewards:", error);
    }
    toast.error(`Rewards belum bisa di-claim: ${reason}`);
  } finally {
    setIsClaiming(false);
  }
};

const handleWithdraw = async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      toast.error("MetaMask belum terinstall!");
      return;
    }
    setIsWithdrawing(true);
    
    try {
    const provider = new BrowserProvider(ethereum as never);
    const signer = await provider.getSigner();
    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    const withdrawAmount = parseUnits(stakedBalance, 18);

    toast.loading("Loading bro, Mau narik nih??", { id: "withdraw-toast" });
    const withdrawTx = await stakingContract.withdraw(withdrawAmount);
    await withdrawTx.wait();
    
    toast.dismiss("withdraw-toast");
    toast.success("Mantaap!! semua koin udah di tarik!");

    setStakeAmount("");

    setTimeout(() => fetchBalances(address as string), 2000);
    setTimeout(() => fetchBalances(address as string), 5000);
  } catch (error: unknown) {
    console.log("Gagal Withdraw:", error);

    const message = getErrorMessage(error);
    if (message.includes("Masih dalam masa lock-up")) {
      toast.error("Sabar bro, koin lu masih dikunci! Tunggu masa lock-up kelar.");
    } else {
      toast.dismiss("withdraw-toast");
      toast.error(`Gagal narik saldo! ${message}`);
    }
  } finally {
    setIsWithdrawing(false);
  }
};

const handleCompound = async () => {
  setIsCompounding(true);
  try {
    const ethereum = getEthereum();
    if (!ethereum) {
      toast.error("MetaMask belum terinstall!");
      return;
    }

    const provider = new BrowserProvider(ethereum as never);
    const signer = await provider.getSigner();
    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    
    toast.loading("Tunggu ya bro lagi prosess...", {id: "compound-toast"});
    
    const tx = await stakingContract.autoCompound();
    await tx.wait();
    
    toast.dismiss("compound-toast");
    toast.success("Gebleeeh seleteh,Gampang kan bro??");

    setTimeout(() => fetchBalances(address as string), 2000);
    setTimeout(() => fetchBalances(address as string), 5000);
  } catch (error: unknown) {
    toast.dismiss("compound-toast");
    toast.error(`Gagal...${getErrorMessage(error)}`);
  } finally {
    setIsCompounding(false);
  }
};

const handleUnStake = async () => {
  if (isUnStake || Number(stakedBalance) === 0) return;
setIsUnStake(true);

try {
  const ethereum = getEthereum();
  if(!ethereum) {
    toast.success("Cek Metamask");
    return;
  }

  const provider = new BrowserProvider(ethereum as never);
  const signer = await provider.getSigner();
  const amountToUnStake = parseUnits(stakedBalance, 18);
  const unStakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
  
  toast.loading("Loading yaa,Udah Unstake aja,rugi dong!!", { id: "unstake-toast"});
  
  const txUnStake = await unStakingContract.withdraw(amountToUnStake);
  await txUnStake.wait();
  
  toast.dismiss("unstake-toast");
  toast.success("Kehed Berhasil Di Tarik Dari Stake");

  setStakeAmount("");

  setTimeout(() => fetchBalances(address as string), 2000);
  setTimeout(() => fetchBalances(address as string), 5000);

} catch (error: unknown) {
      toast.dismiss("unstake-toast");
      toast.error(`Gagal Narik Bro! ${getErrorMessage(error)}`);
} finally {
  setIsUnStake(false);
}
};

const handleMaxStake = () => {
  if (khdBalance && Number(khdBalance) > 0) {
    setStakeAmount(khdBalance);
  } else {
    toast.error("Gak ada saldo Kehed!!")
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center py-10 px-4 relative">
      <Toaster position="top-center" reverseOrder={false}/>

      <div className="absolute top-6 right-6">
        <ConnectButton/>
        <AdminPanel currentAccount={address || ""} />
      </div>

      <h1 className="text-4xl font-extrabold mb-8 mt-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
        Pabrik Staking Si KEHED
      </h1>

      {address ? (
        <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700 flex flex-col gap-6">

          <div className="text-center">
            <p className="text-green-400 font-bold text-sm"> Dompet Terhubung!</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {address.substring(0, 6)}...{address.substring(38)}
            </p>
          </div> 

          <div className="flex justify-between bg-gray-900 p-4 rounded-xl border border-gray-700">
            <div>
              <p className="text-gray-400 text-xs">Saldo Wallet</p>
              <p className="font-bold text-lg text-blue-400">{khdBalance || "0"} KHD</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Koin Di-Lock (Stake)</p>
              <p className="font-bold text-lg text-green-400">{stakedBalance || "0"} KHD</p>
            </div>
          </div>

          {Number(stakedBalance) > 0 && (
            <div className="flex justify-between item-centers bg-gray-800/80 p-4 rounded-xl border border-yellow-700/50 mt-2">
              <div className="text-left">
                <p className="text-yellow-500 text-sm mb-1 font-bold">Pending Reward 10%</p>
                <p className="font-bold text-lg text-yellow-400">{liveReward.toFixed(2)} KHD</p>
              </div>
              <div className="text-right flex flex-col items-end">  
                <p className="text-gray-400 text-sm mb-1">Status Koin Lock</p>
                <p className={`font-bold text-sm mb-2 ${(unlockTimeLeft > 0 || claimTimeLeft > 0)? "text-yellow-400" : "text-green-400"}`}>
                  {unlockTimeLeft > 0 ?
                  `Lock: ${unlockTimeLeft}s`
                  : claimTimeLeft > 0 ?
                   `Cooldown: ${claimTimeLeft}s` 
                   : "Bisa ditarik sekarang"}
                </p>
                {(unlockTimeLeft > 0 || claimTimeLeft > 0) ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-md mt-1">
                    Terkunci Bro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md mt-1">
                    Gas Tarikk!!
                  </span> 
                )}
              </div>
            </div>
          )}

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Jumlah KHD untuk di stake"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 pr-16 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              onClick={handleMaxStake}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600/20 text-purple-400 hover:text-white px-2 py-1 rounded-md text-xs font-bold transition-all"
            >
              MAX
            </button> 
          </div>

          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount || isNaN(Number(stakeAmount))}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
              isStaking || !stakeAmount 
              ? "bg-gray-600 cursor-not-allowed opacity-50" 
              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 hover:scale-[1.02]"
            }`}
          >
            {isStaking ? "Staking..." : "Stake KHD"}
          </button>
              
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={handleUnStake}
              disabled={isUnStake || Number(stakedBalance) === 0 || unlockTimeLeft > 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isUnStake || Number(stakedBalance) === 0 || unlockTimeLeft > 0 ? "bg-gray-500 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-500"
              }`}
            >
              {unlockTimeLeft > 0 ? `Lock ${unlockTimeLeft}s` : isUnStake ? "Tarik sis..." : "Unstake"}
            </button>

            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || Number(stakedBalance) === 0 || unlockTimeLeft > 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isWithdrawing || Number(stakedBalance) === 0 || unlockTimeLeft > 0 ? "bg-gray-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {unlockTimeLeft > 0 ? `Lock ${unlockTimeLeft}s` : "Withdraw Lock"}
            </button>

            <button
              onClick={handleClaim}
              disabled={isClaiming || Number(stakedBalance) === 0 || claimTimeLeft > 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isClaiming || Number(stakedBalance) === 0 || claimTimeLeft > 0 ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {claimTimeLeft > 0 ? `Tunggu ${claimTimeLeft}s` : isClaiming ? "Claiming..." : "Claim Rewards"}
            </button>

            <button
              onClick={handleCompound}
              disabled={isCompounding || Number(stakedBalance) === 0 || claimTimeLeft > 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isCompounding || Number(stakedBalance) === 0 || claimTimeLeft > 0 ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {claimTimeLeft > 0 ? `Tunggu ${claimTimeLeft}s` : isCompounding ? "Compounding..." : "Sugiihh (Compound)"}
            </button>
          </div>

        </div>
      ) : (
        <div className="mt-20 text-xl font-bold text-gray-400">
          Silahkan hubungkan dompet di pojok kanan atas yaa...
        </div>
      )}

      {/* Bagian Riwayat Global */}
      <div className="w-full max-w-md mt-8 bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
        <h2 className="text-xl font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">
          🌍 Statistik Global
        </h2>
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-400">Total KHD Terkunci</p>
          <p className="text-2xl font-black text-purple-400">{globalStaked} KHD</p>
        </div>
        <h2 className="text-xl font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">
          📜 5 Transaksi Stake Terakhir
        </h2>
        <div className="flex flex-col gap-3">
          {txHistory.length > 0 ? (
            txHistory.map((tx, index) => (
              <div key={index} className="flex justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                <p className="text-sm font-mono text-gray-400">
                  {tx.user.substring(0, 6)}...{tx.user.substring(38)}
                </p>
                <p className="text-sm font-bold text-green-400">
                  +{Number(tx.amount).toFixed(2)} KHD
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-gray-500 italic">Belum Ada riwayat apapun</p>
          )}
        </div>
      </div>
    </main>
  );
}