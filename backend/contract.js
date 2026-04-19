require("dotenv").config();
const { ethers } = require("ethers");

const ALCHEMY_URL = (process.env.ALCHEMY_URL || "").trim();
const PRIVATE_KEY  = (process.env.PRIVATE_KEY  || "").trim();

// Log sanitised values so you can confirm they loaded on Render
console.log("ALCHEMY_URL length :", ALCHEMY_URL.length);
console.log("ALCHEMY_URL prefix :", ALCHEMY_URL.slice(0, 40) + "...");
console.log("PRIVATE_KEY exists :", PRIVATE_KEY.length > 0);

if (!ALCHEMY_URL) throw new Error("❌ ALCHEMY_URL is missing or empty");
if (!PRIVATE_KEY)  throw new Error("❌ PRIVATE_KEY is missing or empty");

// ── Build provider ────────────────────────────────────────────────────────
// We use a plain JsonRpcProvider (NOT StaticJsonRpcProvider) but pass the
// network object explicitly — this stops the eth_chainId detection call
// while still working on Render's outbound network.
const network = { name: "sepolia", chainId: 11155111 };

// Build a fresh provider on each call so a stale connection never blocks us
function makeProvider() {
  return new ethers.providers.JsonRpcProvider(ALCHEMY_URL, network);
}

// Build a fresh wallet+contract on each call
function makeContract() {
  const provider = makeProvider();
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  return contract;
}

const CONTRACT_ADDRESS = "0xfCB8F412D676BBD5Ac84Abb1be0138b2Db95d961";

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "string", name: "", type: "string" }],
    name: "certificates",
    outputs: [
      { internalType: "string",  name: "studentName", type: "string"  },
      { internalType: "string",  name: "course",      type: "string"  },
      { internalType: "string",  name: "issuer",      type: "string"  },
      { internalType: "uint256", name: "issueDate",   type: "uint256" },
      { internalType: "bool",    name: "isValid",     type: "bool"    },
      { internalType: "string",  name: "txHash",      type: "string"  },
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

// Export a factory so server.js gets a fresh contract per request
module.exports = { makeContract, makeProvider, CONTRACT_ADDRESS, CONTRACT_ABI };