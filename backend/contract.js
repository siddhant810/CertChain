console.log("ALCHEMY_URL:", process.env.ALCHEMY_URL);
console.log("PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);

const { ethers } = require("ethers");
require("dotenv").config();

const ALCHEMY_URL = process.env.ALCHEMY_URL;

if (!ALCHEMY_URL) {
  throw new Error("❌ ALCHEMY_URL is missing");
}

// 🔥 FORCE STATIC PROVIDER (NO AUTO-DETECTION)
const provider = new ethers.providers.StaticJsonRpcProvider(
  ALCHEMY_URL,
  {
    name: "sepolia",
    chainId: 11155111,
  }
);

// 🔥 FORCE CONNECTION TEST
(async () => {
  try {
    const block = await provider.getBlockNumber();
    console.log("✅ Connected to Sepolia. Block:", block);
  } catch (err) {
    console.error("❌ Provider connection failed:", err);
  }
})();

// ✅ Wallet (from ENV)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Your deployed contract
const contractAddress = "0xfCB8F412D676BBD5Ac84Abb1be0138b2Db95d961";

// ABI must exactly match CertificateVerification.sol
const contractABI = [
  {
    "inputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "name": "certificates",
    "outputs": [
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "course", "type": "string" },
      { "internalType": "string", "name": "issuer", "type": "string" },
      { "internalType": "uint256", "name": "issueDate", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" },
      { "internalType": "string", "name": "txHash", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "hash", "type": "string" },
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "course", "type": "string" },
      { "internalType": "string", "name": "issuer", "type": "string" },
      { "internalType": "string", "name": "txHash", "type": "string" }
    ],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "hash", "type": "string" }],
    "name": "verifyCertificate",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "hash", "type": "string" }],
    "name": "revokeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "hash", "type": "string" }],
    "name": "getCertificate",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

module.exports = contract;

console.log("Provider:", process.env.ALCHEMY_URL);
console.log("Wallet loaded:", wallet.address);