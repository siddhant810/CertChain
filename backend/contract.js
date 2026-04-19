require("dotenv").config();

const { ethers } = require("ethers");

// ── Validate env vars immediately ──────────────────────────────────────────
const ALCHEMY_URL = process.env.ALCHEMY_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!ALCHEMY_URL) throw new Error("❌ ALCHEMY_URL env var is missing");
if (!PRIVATE_KEY) throw new Error("❌ PRIVATE_KEY env var is missing");

console.log("🔗 Connecting to:", ALCHEMY_URL.replace(/\/v2\/.+/, "/v2/***"));

// ── Provider ───────────────────────────────────────────────────────────────
// StaticJsonRpcProvider skips the eth_chainId auto-detect call that causes
// "noNetwork" errors on cold starts. We hard-code Sepolia's network info.
const provider = new ethers.providers.StaticJsonRpcProvider(
  {
    url: ALCHEMY_URL,
    timeout: 30000,          // 30s timeout for slow cold starts
  },
  {
    name: "sepolia",
    chainId: 11155111,
  }
);

// ── Wallet ─────────────────────────────────────────────────────────────────
let wallet;
try {
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("✅ Wallet loaded:", wallet.address);
} catch (err) {
  throw new Error(`❌ Invalid PRIVATE_KEY: ${err.message}`);
}

// ── Contract ───────────────────────────────────────────────────────────────
const contractAddress = "0xfCB8F412D676BBD5Ac84Abb1be0138b2Db95d961";

const contractABI = [
  {
    inputs: [{ internalType: "string", name: "", type: "string" }],
    name: "certificates",
    outputs: [
      { internalType: "string", name: "studentName", type: "string" },
      { internalType: "string", name: "course",      type: "string" },
      { internalType: "string", name: "issuer",      type: "string" },
      { internalType: "uint256", name: "issueDate",  type: "uint256" },
      { internalType: "bool",   name: "isValid",     type: "bool" },
      { internalType: "string", name: "txHash",      type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "hash",        type: "string" },
      { internalType: "string", name: "studentName", type: "string" },
      { internalType: "string", name: "course",      type: "string" },
      { internalType: "string", name: "issuer",      type: "string" },
      { internalType: "string", name: "txHash",      type: "string" },
    ],
    name: "issueCertificate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "hash", type: "string" }],
    name: "verifyCertificate",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "hash", type: "string" }],
    name: "revokeCertificate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "hash", type: "string" }],
    name: "getCertificate",
    outputs: [
      { internalType: "string",  name: "", type: "string"  },
      { internalType: "string",  name: "", type: "string"  },
      { internalType: "string",  name: "", type: "string"  },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bool",    name: "", type: "bool"    },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// ── Lazy connection check (non-blocking) ───────────────────────────────────
// Don't await this — just log. Server starts immediately without waiting.
provider.getBlockNumber()
  .then((block) => console.log(`✅ Sepolia connected. Latest block: ${block}`))
  .catch((err)  => console.error("⚠️  Provider ping failed (will retry on first request):", err.message));

module.exports = contract; 