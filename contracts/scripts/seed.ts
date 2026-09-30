import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer, manager, auditor, user1, user2] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deploymentPath = path.join(__dirname, `../deployments/deployment-${network.chainId}.json`);

  const deployment = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, "utf-8"))
    : null;
  let accessControlAddress = deployment?.contracts?.AccessControlManager;
  let identityRegistryAddress = deployment?.contracts?.IdentityRegistry;
  let assetNFTAddress = deployment?.contracts?.AssetNFT;

  const code = accessControlAddress ? await ethers.provider.getCode(accessControlAddress) : "0x";
  if (!code || code === "0x") {
    console.log("No deployed contracts detected on this network instance. Auto-deploying for seeding...");
    const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
    const ac = await AccessControlFactory.deploy();
    await ac.waitForDeployment();
    accessControlAddress = await ac.getAddress();

    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    const ir = await IdentityRegistryFactory.deploy();
    await ir.waitForDeployment();
    identityRegistryAddress = await ir.getAddress();

    const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
    const nft = await AssetNFTFactory.deploy(accessControlAddress, identityRegistryAddress);
    await nft.waitForDeployment();
    assetNFTAddress = await nft.getAddress();
  }

  const accessControl = await ethers.getContractAt("AccessControlManager", accessControlAddress);
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", identityRegistryAddress);
  const assetNFT = await ethers.getContractAt("AssetNFT", assetNFTAddress);

  // 1. Grant roles
  const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
  const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
  const USER_ROLE = await accessControl.USER_ROLE();

  console.log("Granting roles...");
  await (await accessControl.grantRole(MANAGER_ROLE, manager.address)).wait();
  await (await accessControl.grantRole(AUDITOR_ROLE, auditor.address)).wait();
  await (await accessControl.grantRole(USER_ROLE, user1.address)).wait();
  await (await accessControl.grantRole(USER_ROLE, user2.address)).wait();
  console.log("Roles granted successfully.");

  // 2. Register identities
  console.log("Registering identities...");
  const did1 = `did:ethr:${user1.address}`;
  const did2 = `did:ethr:${user2.address}`;
  const pubKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user1"));
  const pubKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user2"));

  if (!(await identityRegistry.isRegistered(user1.address))) {
    await (await identityRegistry.connect(user1).registerIdentity(did1, pubKeyHash1)).wait();
    console.log(`Registered ${user1.address} -> ${did1}`);
  }

  if (!(await identityRegistry.isRegistered(user2.address))) {
    await (await identityRegistry.connect(user2).registerIdentity(did2, pubKeyHash2)).wait();
    console.log(`Registered ${user2.address} -> ${did2}`);
  }

  // 3. Mint demo assets
  console.log("Minting initial assets...");
  const sampleIpfsUri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/asset-1.json";
  const tx = await assetNFT.connect(manager).mintToIdentity(user1.address, sampleIpfsUri);
  await tx.wait();
  console.log(`Minted Token #1 to ${user1.address} (DID: ${did1})`);

  console.log("Seeding complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
