const { ethers } = require("ethers");

// ⚠️ TEMP FIX (for debugging only)
const provider = new ethers.providers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/0guzWarJLHawQ0TQxzp_Q"
);

const wallet = new ethers.Wallet(
  "317f66e064447c1ffbb70e432c50c3808f6f5a6e6e08a79cdb1aaae2eaa8e3c8", // without 0x or with 0x both fine
  provider
);

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