const {
  CONTRACTS_DIR,
  run,
  waitForHardhatNode,
  stopProcessTree,
  parseDeployedAddress,
  spawnHardhatNode,
  smokeEnv,
} = require('./smoke-utils');

async function main() {
  const nodeProcess = spawnHardhatNode();

  try {
    await waitForHardhatNode(nodeProcess);

    run('npm run build', CONTRACTS_DIR);
    const deployOutput = run('npm run deploy:local', CONTRACTS_DIR);
    const deployedAddress = parseDeployedAddress(deployOutput);

    run('npm run export:abi', CONTRACTS_DIR);

    run('npx hardhat run scripts/revocation-policy-check.js --network localhost', CONTRACTS_DIR, smokeEnv({
      AGENT_REGISTRY_ADDRESS: deployedAddress
    }));

    console.log('✅ Revocation policy smoke completed successfully');
  } finally {
    stopProcessTree(nodeProcess.pid);
  }
}

main().catch((error) => {
  console.error('❌ Revocation policy smoke failed');
  console.error(error);
  process.exit(1);
});
