import React, { useEffect, useState } from "react";
import { ethers, parseEther } from "ethers";
import Web3Modal from "web3modal";
import { contract_address, abi } from "./contractInfo";

function App() {
  const [account, setAccount] = useState(null);
  const [isSaleActive, setIsSaleActive] = useState(false);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [isOwner, setIsOwner] = useState(false); // 用來追蹤是否為合約擁有者
  const [loadingMint, setLoadingMint] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      setSigner(signer);
      const account = await signer.getAddress();
      setAccount(account);
    } catch (error) {
      console.error("錢包連接失敗:", error);
    }
  };
  const fetchNFTs = async () => {
    if (signer && contract && account) {
      try {
        const balance = await contract.balanceOf(account);
        const nftData = [];
        const balanceNumber = parseInt(balance.toString(), 10); // 轉換 BigNumber 為數字

        for (let i = 0; i < balanceNumber; i++) {
          const tokenId = await contract.tokenOfOwnerByIndex(account, i);
          const tokenURI = await contract.tokenURI(tokenId);
          const httpUri = tokenURI.replace(
            "ipfs://",
            "https://red-yeasty-termite-878.mypinata.cloud/ipfs/"
          );
          const response = await fetch(httpUri);
          const data = await response.json();

          nftData.push({
            id: data.edition,
            uri: data.image.replace(
              "ipfs://",
              "https://red-yeasty-termite-878.mypinata.cloud/ipfs/"
            )
          });
        }

        setNfts(nftData);
      } catch (error) {
        console.error("獲取 NFT 失敗:", error);
      }
    }
  };

  const handleMint = async () => {
    try {
      setLoadingMint(true);
      const mintPrice = parseEther("0.01"); // 將 ETH 轉換為 wei
      const tx = await contract?.mintNFTMeta(1, {
        value: mintPrice // 傳遞鑄造 NFT 的 ETH
      });

      await tx?.wait(); // 等待交易被區塊鏈確認
      alert("NFT 鑄造成功!");
      fetchNFTs(); // 鑄造成功後重新獲取 NFT 列表
    } catch (error) {
      alert("鑄造失敗: " + error.message);
    } finally {
      setLoadingMint(false);
    }
  };

  const handleWithdraw = async () => {
    if (!contract) return;
    try {
      setLoadingWithdraw(true);
      const tx = await contract.withdraw(account);
      await tx?.wait();
      alert("提領成功!");
      fetchNFTs();
    } catch (error) {
      alert("提領失敗: " + error.message);
    } finally {
      setLoadingWithdraw(false); // 提領結束時設置為 false
    }
  };

  const checkOwner = async () => {
    if (!contract || !account) return;
    try {
      const owner = await contract.owner(); // 從合約取得擁有者地址
      setIsOwner(owner === account); // 檢查當前帳戶是否為擁有者
    } catch (error) {
      console.error("檢查擁有者失敗:", error);
    }
  };

  useEffect(() => {
    const initializeContractAndCheckSaleStatus = async () => {
      if (signer) {
        try {
          const contractInstance = new ethers.Contract(
            contract_address,
            abi,
            signer
          );
          setContract(contractInstance);

          // 檢查銷售狀態
          const saleActive = await contractInstance._isSaleActive();
          setIsSaleActive(saleActive);
        } catch (error) {
          console.error("合約操作失敗:", error);
        }
      }
    };

    initializeContractAndCheckSaleStatus();
  }, [signer]);

  useEffect(() => {
    fetchNFTs();
  }, [signer, contract, account]);

  useEffect(() => {
    checkOwner();
  }, [account, contract]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
        {!account ? (
          <button
            onClick={connectWallet}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
          >
            連接錢包
          </button>
        ) : (
          <p className="text-lg font-semibold mb-4">已連接錢包：{account}</p>
        )}

        {signer ? (
          isSaleActive ? (
            <button
              onClick={handleMint}
              className={`bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition ${
                loadingMint ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loadingMint}
            >
              {loadingMint ? "鑄造中..." : "鑄造 NFT"}
            </button>
          ) : (
            <p className="text-red-500">尚未開賣</p>
          )
        ) : null}

        <div className="mt-6">
          {account ? (
            nfts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {nfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="bg-white p-4 rounded-lg shadow-md"
                  >
                    <p className="text-lg font-semibold mb-2">
                      Token ID: {nft.id}
                    </p>
                    <img
                      src={nft.uri}
                      alt={`NFT ${nft.id}`}
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">沒有 NFT</p>
            )
          ) : (
            ""
          )}
        </div>
        {isOwner && (
          <button
            className={`bg-red-500 text-white py-2 px-4 rounded hover:bg-green-600 transition mt-6 ${
              loadingWithdraw ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleWithdraw}
            disabled={loadingWithdraw}
          >
            {loadingWithdraw ? "提領中..." : "提領"}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
