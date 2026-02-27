const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const AgentRegistry = await hre.ethers.getContractFactory('AgentRegistry');
  const contract = await AgentRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`AgentRegistry deployed at: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
