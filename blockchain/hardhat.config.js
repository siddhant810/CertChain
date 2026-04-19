require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/0guzWarJLHawQ0TQxzp_Q",
      accounts: ["317f66e064447c1ffbb70e432c50c3808f6f5a6e6e08a79cdb1aaae2eaa8e3c8"]
    }
  }
};