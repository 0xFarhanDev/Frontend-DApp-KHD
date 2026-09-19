import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import { STAKING_ADDRESS, STAKING_ABI } from "./constants";
import toast from "react-hot-toast";

export default function AdminPanel({ currentAccount }: { currentAccount: string }) {
    const [isOwner, setIsOwner] = useState (false);
    const [isPaused, setIsPaused] = useState (false);
    const [emWithdrawAmount, setEmWithrawAmount] = useState("");

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
            const provider = new ethers.BrowserProvider(window.ethereum);
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
            const provider = new ethers.BrowserProvider(window.ethereum);
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
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

        const mount = ethers.parseUnits(emWithdrawAmount, 18);

        toast.loading("Lagi proses emergancy",{ id: "emwithdraw-toast"});

        const tx = await contract.emergancyWithdrawToken(mount);
        await tx.wait();

        toast.dismiss("emwithdraw-toast");
        toast.success(`Emergancy Witdraw Sukses ${emWithdrawAmount}`);
        
        setEmWithrawAmount("");


    } catch (error: unknown) {
        toast.dismiss("emwithdraw-toast");
        toast.error("Error Emergancy Witdraw bro");
        console.error(error);
    }
  };
  if(!isOwner) return null;

  return (
    <div style={{ padding: "20px", border: "2x dasher red", borderRadius: "10px", marginTop: "20px" }}>
        <h3 style={{ color: "red", margin: "0 0 10px 0" }}>Admin Panel: (Si Kehed Admin)</h3>
        <p style={{ fontWeight: "bold"}}> Status Kontrak: {isPaused ? "Paused" : "Active Bre"}</p>

        <div style={{ display: "flex", gap: "10px", marginTop: "15px"}}>
            {isPaused ? (
                <button onClick={handleUnpause} style={{ background: "green", color: "white", padding: "10px 20px", cursor: "pointer", border: "none", borderRadius: "5px"}}>
                    Buka Gembok (Unpause)
                </button>
            ) : (
                <button onClick={handlePaused} style={{ background: "orange", color: "black", padding: "10px 20px", cursor: "pointer", border: "none", borderRadius: "5px"}}>
                    Kunci Gembok (Pause)
                </button>
            )}
            </div>
            <div className="mt-4 border-t border-gray-700 pt-4">
                <p className="text-red text-sm font-bold mb-2">Wilayah Kehed Only</p>
                <input
                type="text"
                placeholder="Jumlah KHD Yang urgent"
                value={emWithdrawAmount}
                onChange={(e) => setEmWithrawAmount(e.target.value)}
                className="w-full bg-gray-900 border border-red-900/50 rounded-xl px-4 py-2 text-white mb-3 focus:outline-none focus:border-red-500 trasition-colors"
            />
            <button onClick={handleEmergancyWithdraw} style={{ background: "red", color: "white", padding: "10px 20px", cursor: "pointer", border: "none", borderRadius: "5px"}}>
                Tarik Darurat KHD
            </button>
        
        </div>
    </div>
  );
}