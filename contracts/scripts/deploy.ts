import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=================================================");
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  console.log("=================================================");

  // 1. Deploy AccessControlManager
  console.log("\n1. Deploying AccessControlManager...");
  const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
  const accessControl = await AccessControlFactory.deploy();
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log(" AccessControlManager deployed at:", accessControlAddress);

  // 2. Deploy IdentityRegistry
  console.log("\n2. Deploying IdentityRegistry...");
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log(" IdentityRegistry deployed at:", identityRegistryAddress);

  // 3. Deploy AssetNFT
  console.log("\n3. Deploying AssetNFT...");
  const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFTFactory.deploy(accessControlAddress, identityRegistryAddress);
  await assetNFT.waitForDeployment();
  const assetNFTAddress = await assetNFT.getAddress();
  console.log(" AssetNFT deployed at:", assetNFTAddress);

  // Grant roles to deployer for immediate administration & testing
  const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
  const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
  await accessControl.grantRole(MANAGER_ROLE, deployer.address);
  await accessControl.grantRole(AUDITOR_ROLE, deployer.address);
  console.log("\n Granted MANAGER_ROLE & AUDITOR_ROLE to deployer:", deployer.address);

  // Export deployment manifest
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AccessControlManager: accessControlAddress,
      IdentityRegistry: identityRegistryAddress,
      AssetNFT: assetNFTAddress,
    },
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `deployment-${deploymentInfo.chainId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n Deployment info saved to:", outputPath);
  console.log("=================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
