"use client";

import { useEffect } from "react";
import { useState } from "react";
import { BrowserProvider, Contract, formatEther, parseUnits, ethers } from "ethers";
import { KHD_ADDRESS, KHD_ABI, STAKING_ADDRESS, STAKING_ABI } from "./constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWatchContractEvent } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useDappStore } from '../store/useDappStore';

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
  const { address } = useAccount();
  const [pendingReward, setPendingReward] = useState("0");
  const [unlockTime, setUnlockTime] = useState(0);

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

    const rawTimestamp = await stakingContract.stakeTimestamp(address);

    const rawReward = (rawStaked * BigInt(10)) / BigInt(100);
  
     const formattedEth = ethers.formatEther(rawEth);
     const formattedKhd = ethers.formatEther(rawKhd);
     const formattedStaked = ethers.formatEther(rawStaked);
     const formattedReward = ethers.formatEther(rawReward);
    
     console.log(" Saldo Staking di Tarik Dari Jaringan:", formattedStaked);
     toast.dismiss("home-toast");

    setBalance(formattedEth);
    setKhdBalance(formattedKhd);
    setStakedBalance(formattedStaked);

    setPendingReward(formattedReward);
    setUnlockTime(Number(rawTimestamp) + 60);

    setBalances(formattedEth, formattedKhd, formattedStaked);
  } catch (error: unknown) {
    console.error("Gagal mengambil saldo:", error);
    toast.dismiss("home-toast");
    toast.error("Salah Jaringan Blegug");
  } finally {
    setIsBalance(false);
  }
};

  useEffect(() => {
    if (address) {
      fetchBalances(address as string);
    }
  }, [address]);

  const TARGET_CHAIN_ID = '0x14a34';
  const currentTime = Math.floor(Date.now() / 1000);
  const isLocked = currentTime < unlockTime && Number(stakedBalance) > 0;

  const checkAndSwitchNetwork = async () => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    try {
      const currentChainId = await ethereum.request({ method: 'eth_chainId'});

      if (currentChainId === TARGET_CHAIN_ID) {
        console.log("Jaringan Udah Bener: Base Sepolia");
        return true;
      }
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

    if (address) {
      fetchBalances(address as string);
    }
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

    if (address) {
      fetchBalances(address as string);
    }
  },
 })
useWatchContractEvent({
  address: STAKING_ADDRESS as `0x{$string}`,
  abi: STAKING_ABI,
  eventName: 'Withdrawn',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Withdraw Masuukk..', Logs);
    toast.success("Penarikan Berhasil!! Saldo otomatis Masook");

    if (address) {
      fetchBalances(address as string);
    }
  },
})
useWatchContractEvent({
  address: STAKING_ADDRESS as `0x{$string}`,
  abi: STAKING_ABI,
  eventName: 'Compounded',
  syncConnectedChain: true,
  onLogs(Logs) {
    console.log('Cie yang lagi ngompound, Masuukk..', Logs);
    toast.success("Compoud Berhasil!! Saldo otomatis Masook");

    if (address) {
      fetchBalances(address as string);
    }
  },
})

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

const handleTransferKHD = async () => {
  try {
    if (!recipient || !transferAmount) {
      toast.error("Tolong isi alamat penerima dan jumlah KHD yang mau ditransfer.");
      return;
    }

    const ethereum = getEthereum();
    if (!ethereum) {
      toast.error("MetaMask belum terinstall!");
      return;
    }

    const provider = new BrowserProvider(ethereum as never);
    const signer = await provider.getSigner();
    const khdContract = new Contract(KHD_ADDRESS, KHD_ABI, signer);
    const parsedAmount = ethers.parseUnits(transferAmount, 18);

    toast.success("Cek Metamask lu bro, konfirmasi transaksi KHD!");
    const tx = await khdContract.transfer(recipient, parsedAmount);
    await tx.wait();

    toast.success("Transfer KHD berhasil, Saldo bakal di-refresh!");
    window.location.reload();
  } catch (error: unknown) {
    console.error("Gagal melakukan transfer KHD:", error);
    toast.error(`Gagal transfer KHD! ${getErrorMessage(error)}`);
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

    const userAddress = await signer.getAddress();

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

    setTimeout(() => {
      console.log("Reflesh Pertama...");
      fetchBalances(userAddress);
    }, 2000);

    setTimeout(() => {
      console.log("Reflesh ke dua....");
      fetchBalances(userAddress);
    }, 6000);
    
    fetchBalances(userAddress);

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
    const userAddress = await signer.getAddress();

    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    
    toast.loading("Tunggu yaa Reward nya lagi di prosses", { id: "claim-toast"});
   
    const tx = await stakingContract.claimReward();
    await tx.wait();
    
    toast.dismiss("claim-toast");
    toast.success("Claim rewards berhasil, Saldo bakal di-refresh!");

    setTimeout(() => {
      console.log("Reflesh Pertama...");
      fetchBalances(userAddress);
    }, 2000);

    setTimeout(() => {
      console.log("Reflesh ke dua....");
      fetchBalances(userAddress);
    }, 6000);

    fetchBalances(userAddress);
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

    const userAddress = await signer.getAddress();

    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    
    const withdrawAmount = parseUnits(stakedBalance, 18);

    toast.loading("Loading bro, Mau narik nih??", { id: "withdraw-toast" });
    const withdrawTx = await stakingContract.withdraw(withdrawAmount);
    await withdrawTx.wait();
    
    toast.dismiss("withdraw-toast");
    toast.success("Mantaap!! semua koin udah di tarik!");

    setStakeAmount("");

    fetchBalances(userAddress);

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
    const userAddress = await signer.getAddress();

    const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    
    toast.loading("Tunggu ya bro lagi prosess...", {id: "compound-toast"});
    
    const tx = await stakingContract.autoCompound();
    await tx.wait();
    
    toast.dismiss("compound-toast");
    toast.success("Gebleeeh seleteh,Gampang kan bro??");

    setTimeout(() => {
      console.log("Reflesh Pertama...");
      fetchBalances(userAddress);
    }, 2000);

    setTimeout(() => {
      console.log("Reflesh ke dua....");
      fetchBalances(userAddress);
    }, 6000);

    fetchBalances(userAddress);
  } catch (error: unknown) {
    toast.dismiss("compound-toast");
    console.log("Gagal bro,Ulang lagi ya,Semoga di lancarkan!!!", error);

    const message = getErrorMessage(error);
    if (message.includes("Masih proses yaa...")) {
      toast.error("Yang sabar ya guys...");
    } else {
      toast.error(`Gagal.... ${message}`);
    }
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
  const userAddress = await signer.getAddress();

  const amountToUnStake = parseUnits(stakedBalance, 18);

  const unStakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
  
  toast.loading("Loading yaa,Udah Unstake aja,rugi dong!!", { id: "unstake-toast"});
  
  const txUnStake = await unStakingContract.withdraw(amountToUnStake);
  await txUnStake.wait();
  
  toast.dismiss("unstake-toast");
  toast.success("Kehed Berhasil Di Tarik Dari Stake");

  setStakeAmount("");

    setTimeout(() => {
      console.log("Reflesh Pertama...");
      fetchBalances(userAddress);
    }, 2000);

    setTimeout(() => {
      console.log("Reflesh ke dua....");
      fetchBalances(userAddress);
    }, 6000);

  fetchBalances(userAddress);

} catch (error: unknown) {
  console.error("Gagal tarik sis...??", error);

    const message = getErrorMessage(error);
    if (message.includes("ERC20InsufficientBalance")) {
      toast.error("Saldo KHD di kontrak staking tidak cukup untuk menarik jumlah ini.");
    } else {
      toast.dismiss("unstake-toast");
      toast.error(`Gagal Narik Bro! ${message}`);
    } 
} finally {
  setIsUnStake(false);
}
};

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center py-10 px-4 relative">
      <Toaster position="top-center" reverseOrder={false}/>

      <div className="absolute top-6 right-6">
        <ConnectButton/>

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
            <div className="flex justify-between text-center bg-gray-800/80 p-4 rounded-xl border border-yellow-700/50 mt-2">
              <div>
                <p className="text-yellow-500 text-xl font-bold">Pending Reward 10%</p>
                <p className="font-bold text-lg text-yellow-400">{pendingReward} KHD</p>
              </div>
              <div className="text-right">
              <p className="text-gray-400 text-xs">Status Penarikan</p>
              {isLocked ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-md mt-1">
                  Terkunci
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md mt-1">
                  Bisa Di Tarik nih
                </span>
              )}
              </div>
              </div>
          )}

            <div>
            <input
              type="text"
              placeholder="Jumlah KHD untuk di stake"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-purple-500 transition-colors"
            />
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
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
              <button
              onClick={handleUnStake}
              disabled={isUnStake || Number(stakedBalance) === 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isUnStake || Number(stakedBalance) === 0 ? "bg-gray-500 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-500"
                 }`}
                 >
                  {isUnStake ? "Tarik sis....." : "Unstake"}
                 </button>

                 <button
                 onClick={handleWithdraw}
                 disabled={isWithdrawing || Number(stakedBalance) === 0}
                 className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                  isWithdrawing || Number(stakedBalance) === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-500"
                 }`}
                 >
                 Withdraw Lock
                 </button>

              <button
                onClick={handleClaim}
                disabled={isClaiming || Number(stakedBalance) === 0}
                className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                  isClaiming || Number(stakedBalance) === 0 ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
                }`}
              >
               {isClaiming ? "Claiming..." : "Claim Rewards"}
              </button>

              <button
              onClick={handleCompound}
              disabled={isCompounding || Number(stakedBalance) === 0}
              className={`py-2 rounded-lg font-bold text-sm text-white transition-all ${
                isCompounding || Number(stakedBalance) === 0 ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
              >
                {isCompounding ? "Compounding..." : "Sugiihh (Compound)"}
              </button>
              </div>

              </div>
      ) : (
        <div className="mt-20 text-xl font-bold text-gray-400">
          Silahkan hubungkan dompet di pojok kanan atas yaa...
        </div>
      )}
    </main>
  );
 }