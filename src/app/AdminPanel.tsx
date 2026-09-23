import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import { STAKING_ADDRESS, STAKING_ABI, KHD_ADDRESS } from "./constants";
import toast from "react-hot-toast";


export default function AdminPanel({ currentAccount, onRefreshBalance }: { currentAccount: string, onRefreshBalance: () => void }) {
    const [isOwner, setIsOwner] = useState (false);
    const [isPaused, setIsPaused] = useState (false);
    const [emWithdrawAmount, setEmWithrawAmount] = useState("");
    const [maxStakePerUser, setMaxStakePerUser] = useState("");

    useEffect(() => {
        checkAdminStatus();
    }, [currentAccount]);

    const checkAdminStatus = async () => {
        if (!(window as any).ethereum || !currentAccount) return;

        try {
            console.log("1. Dompet yang lagi konek di web :", currentAccount);
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);

            const contractOwner = await contract.owner();
            console.log("2.Owner dari Smart Contract Kehed", contractOwner);

            const pausedStatus = await contract.paused();
            console.log("3. Status Pause:", pausedStatus);

            setIsPaused(pausedStatus);
            
            if (currentAccount.toLowerCase() === contractOwner.toLowerCase()) {
                console.log("4. Hasil: Cocok!! Panel Admin Nih boss");
                setIsOwner(true);
            } else {
                console.log("4. Hasil: Gak Cocok!! Bukan Admin lu, ngapain kemari?");
                setIsOwner(false);
            }
        } catch (error: unknown) {
            console.log("Gagal ngecek status admin:", error)
        }
    };

    const handlePaused = async () => {
        try { 
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

            toast.loading("Bentar yaa lagi proses pause",{ id: "pause-toast" });

            const tx = await contract.pause();
            await tx.wait();

            toast.dismiss("pause-toast");
            toast.success("Stake Berhasil di pause")

            setIsPaused(true);
        } catch (error: unknown) {
            toast.dismiss("pause-toast");
            toast.error("Error saat Paused");
            console.error(error);
        }
    };

    const handleUnpause = async () => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

            toast.loading("Lanjut stake lagi kita",{ id: "unpause-toast" });

            const tx = await contract.unpause();
            await tx.wait();

            toast.dismiss("unpause-toast");
            toast.success("Gas keun sabi nih Stake lagi");

            setIsPaused(false);
            
    } catch (error: unknown) {
        toast.dismiss("unpause-toast");
        toast.error("Error saat Unpause bre!!");
        console.error(error);
    }
  };

  const handleEmergancyWithdraw = async () => {
    
    if(!emWithdrawAmount || Number(emWithdrawAmount) <= 0) {
        toast.error("Isi dulu berapa KHD");
        return;
    }
    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

        const mount = ethers.parseUnits(emWithdrawAmount, 18);

        toast.loading("Lagi proses emergancy",{ id: "emwithdraw-toast"});

        const tx = await contract.emergancyWithdrawToken(mount);
        await tx.wait();

        toast.dismiss("emwithdraw-toast");
        toast.success(`Emergancy Witdraw Sukses ${emWithdrawAmount}`);
        
        setEmWithrawAmount("");

        setTimeout(() => onRefreshBalance(), 2000);
        setTimeout(() => onRefreshBalance(), 5000);


    } catch (error: unknown) {
        toast.dismiss("emwithdraw-toast");
        toast.error("Error Emergancy Witdraw bro");
        console.error(error);
    }
};
    const handleMaxStakePerUser = async () => {
        if (!maxStakePerUser || (Number(maxStakePerUser)) <= 0) {
            toast.error("Berapa Max Terbaru?!!");
            return;
        }
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

        const mount = ethers.parseUnits(maxStakePerUser, 18);

        toast.loading("Lagi Update Limit ya Bro",{id : "maxStakePerUser-toast"});

        const tx = await contract.updadeMaxStake(mount);
        await tx.wait();

        toast.dismiss("maxStakePerUser-toast");
        toast.success(`Oke bro Max Limit nya Udah Update ${maxStakePerUser}`);

        setMaxStakePerUser("");
      } catch (error: unknown) {
        toast.dismiss("maxStakePerUser-toast");
        toast.error("Error Bro Ulang lagi Update nya");
        console.error(error);
    } 
  };
  if(!isOwner) return null;

  return (
    <div className="max-w-md mx-auto mt-4 bg-red-900/30 border border-bg-red-500/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm w-full">
        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            Zona KEHED Sesungguhnya!!
        </h2>
        <div className="flex flex-col gap-4">

            <div className="bg-black/40 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
             <span className="text-gray-300">Status Kontrak:</span>
             <span className={`font-bold ${isPaused ? 'text-red-500' : 'text-green-500'}`}>
                {isPaused ? "Paused(Stop)" : "Aktif(Lanjut)"}
                </span> 
             </div>
            {isPaused ? (
                <button onClick={handleUnpause} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                    Buka Gembok (Unpause)
                </button>
            ) : (
                <button onClick={handlePaused} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                    Kunci Gembok (Pause)
                </button>
            )}

            <hr className="border-red-500/30 my-2"/>
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-300">Tarik KHD Darurat</label>
            <div className="flex gap-2">
                <input
                type="Number"
                placeholder="Jumlah KHD Yang urgent"
                value={emWithdrawAmount}
                onChange={(e) => setEmWithrawAmount(e.target.value)}
                className="bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-red-500"
                />
            <button onClick={handleEmergancyWithdraw} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all whitespace-nowrap">
                Tarik Darurat KHD
            </button>
            </div>
            <hr className="border-red-500/30 my-2"/>
            <div className="flex flex-col gap-2">
                <label className="texr-sm text-gray-300">Update Max Stake</label>
            <div className="flex gap-2">
                <input
                type="number"
                placeholder="Berapa KHD Max Stake?"
                value={maxStakePerUser}
                onChange={(e) => setMaxStakePerUser(e.target.value)}
                className="bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-red-500"
                />
                <button onClick={handleMaxStakePerUser} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all whitespace-nowrap">
                    Update Max Stake
                </button>
                </div>
            </div>
          </div>
        </div>
    </div>
  );
} 