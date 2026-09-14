import { useDappStore} from "../store/useDappStore";

export default function Navbar() {

    const khdBalance = useDappStore((state) => state.khdBalance);
    const ethBalance = useDappStore((state) => state.ethBalance);

    return (
        <nav className="flex justify-between">
         <div>Logo web</div>
         <div>
            <p>ETH: {ethBalance}</p>
            <p>KHD: {khdBalance}</p>
         </div>
        </nav>
    );
}