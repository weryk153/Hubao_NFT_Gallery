import React, { useEffect, useState, useCallback } from "react";
import { ethers, parseEther } from "ethers";
import Web3Modal from "web3modal";
import { contract_address, abi } from "./contractInfo";

function App() {
  const [account, setAccount] = useState("");
  const [isSaleActive, setIsSaleActive] = useState(false);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingMint, setLoadingMint] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // ✅ 新增防閃爍

  const ipfsToHttp = (uri) =>
    uri.replace(
      "ipfs://",
      "https://red-yeasty-termite-878.mypinata.cloud/ipfs/"
    );

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setSigner(signer);
      setAccount(address);
    } catch (error) {
      console.error("錢包連接失敗:", error);
      alert("錢包連接失敗，請再試一次");
    }
  };

  const loadContract = useCallback(async () => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contract_address,
        abi,
        signer
      );
      setContract(contractInstance);

      const saleActive = await contractInstance._isSaleActive();
      setIsSaleActive(saleActive);
    }
  }, [signer]);

  const fetchNFTs = useCallback(async () => {
    if (!contract || !account) return;

    try {
      setHasLoaded(false); // 🟢 防閃爍：載入開始
      setLoadingNFTs(true);
      const balance = await contract.balanceOf(account);
      const result = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(account, i);
        const tokenURI = await contract.tokenURI(tokenId);
        const metadata = await fetch(ipfsToHttp(tokenURI)).then((res) =>
          res.json()
        );

        result.push({
          id: metadata.edition,
          uri: ipfsToHttp(metadata.image)
        });
      }

      setNfts(result);
    } catch (err) {
      console.error("NFT 讀取失敗", err);
    } finally {
      setLoadingNFTs(false);
      setHasLoaded(true); // ✅ 完成後才顯示 NFT 或空狀態
    }
  }, [contract, account]);

  const checkOwner = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
    } catch (error) {
      console.error("檢查擁有者失敗:", error);
    }
  }, [contract, account]);

  const handleMint = async () => {
    if (!contract) return;
    try {
      setLoadingMint(true);
      const tx = await contract.mintNFTMeta(1, {
        value: parseEther("0.01")
      });
      await tx.wait();
      alert("鑄造成功！");
      fetchNFTs(); // 🔄 重新載入 NFT
    } catch (err) {
      alert("鑄造失敗: " + err.message);
    } finally {
      setLoadingMint(false);
    }
  };

  const handleWithdraw = async () => {
    if (!contract) return;
    try {
      setLoadingWithdraw(true);
      const tx = await contract.withdraw(account);
      await tx.wait();
      alert("提領成功！");
    } catch (err) {
      alert("提領失敗: " + err.message);
    } finally {
      setLoadingWithdraw(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  useEffect(() => {
    checkOwner();
  }, [checkOwner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center p-10">
      <div className="w-full max-w-5xl bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-10 shadow-2xl">
        {!account ? (
          <button
            onClick={connectWallet}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition"
          >
            連接錢包
          </button>
        ) : (
          <p className="mb-6 text-lg">
            🎉 歡迎，<span className="text-green-400">{account}</span>
          </p>
        )}

        {account && isSaleActive && (
          <button
            onClick={handleMint}
            disabled={loadingMint}
            className={`mb-6 max-w-xs w-full mx-auto py-3 px-6 rounded-xl font-bold transition text-white ${
              loadingMint
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-green-400 hover:opacity-90"
            }`}
          >
            {loadingMint ? "鑄造中..." : "鑄造 NFT 🚀"}
          </button>
        )}

        {account && !isSaleActive && (
          <p className="text-red-400 mb-6">目前尚未開賣</p>
        )}

        {/* NFT 區塊 */}
        <div className="grid grid-cols-3 gap-8">
          {loadingNFTs ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-72 bg-white/10 animate-pulse rounded-xl"
              />
            ))
          ) : hasLoaded && nfts.length > 0 ? (
            nfts.map((nft) => (
              <div
                key={nft.id}
                className="bg-white/10 border border-white/20 rounded-xl overflow-hidden shadow-md transform hover:scale-105 transition duration-300"
              >
                <div className="bg-black p-4 h-64 flex items-center justify-center">
                  <img
                    src={nft.uri}
                    alt={`NFT ${nft.id}`}
                    className="max-h-full object-contain"
                  />
                </div>
                <div className="p-4 text-center">
                  <p className="font-bold text-white">🎨 Token ID: {nft.id}</p>
                </div>
              </div>
            ))
          ) : hasLoaded && account ? (
            <p className="col-span-3 text-center text-gray-300">
              尚未持有任何 NFT 😿
            </p>
          ) : null}
        </div>

        {isOwner && (
          <button
            onClick={handleWithdraw}
            disabled={loadingWithdraw}
            className={`mt-10 max-w-xs w-full mx-auto py-3 px-6 rounded-xl font-bold transition ${
              loadingWithdraw
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {loadingWithdraw ? "提領中..." : "💰 提領"}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
