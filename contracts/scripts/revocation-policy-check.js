const hre = require('hardhat');

async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
    throw new Error(`Expected revert with message containing: ${expectedMessage}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessage)) {
      throw new Error(`Unexpected revert message. Expected to include "${expectedMessage}", got: ${message}`);
    }
  }
}

async function main() {
  const contractAddress = process.env.AGENT_REGISTRY_ADDRESS;
  if (!contractAddress) {
    throw new Error('AGENT_REGISTRY_ADDRESS is required');
  }

  const [deployer, owner, delegate, newOwner] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt('AgentRegistry', contractAddress);

  const didOne = 'did:agent:polygon:0xpolicy1';
  await (await contract.connect(owner).registerAgent(didOne, `did:ethr:${owner.address}`)).wait();

  await expectRevert(contract.connect(delegate).revokeAgent(didOne), 'not authorized');

  await (await contract.connect(owner).setRevocationDelegate(didOne, delegate.address, true)).wait();

  const isDelegateAuthorized = await contract.isRevocationDelegate(didOne, delegate.address);
  if (!isDelegateAuthorized) {
    throw new Error('Delegate should be authorized after setRevocationDelegate');
  }

  await (await contract.connect(delegate).revokeAgent(didOne)).wait();

  const didOneRevoked = await contract.isRevoked(didOne);
  if (!didOneRevoked) {
    throw new Error('DID should be revoked by authorized delegate');
  }

  const didTwo = 'did:agent:polygon:0xpolicy2';
  await (await contract.connect(owner).registerAgent(didTwo, `did:ethr:${owner.address}`)).wait();

  await (await contract.connect(owner).transferAgentOwnership(didTwo, newOwner.address)).wait();

  await expectRevert(
    contract.connect(owner).setRevocationDelegate(didTwo, delegate.address, true),
    'only owner'
  );

  await (await contract.connect(newOwner).setRevocationDelegate(didTwo, delegate.address, true)).wait();
  await (await contract.connect(delegate).revokeAgent(didTwo)).wait();

  const didTwoRevoked = await contract.isRevoked(didTwo);
  if (!didTwoRevoked) {
    throw new Error('DID should be revoked after ownership transfer + delegation');
  }

  console.log('✅ Revocation policy check completed successfully');
}

main().catch((error) => {
  console.error('❌ Revocation policy check failed');
  console.error(error);
  process.exit(1);
});
