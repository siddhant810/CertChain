const hre = require("hardhat");

async function main() {

  const Certificate = await hre.ethers.getContractFactory("CertificateVerification");

  const certificate = await Certificate.deploy();

  await certificate.deployed();

  console.log("Contract deployed to:", certificate.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });