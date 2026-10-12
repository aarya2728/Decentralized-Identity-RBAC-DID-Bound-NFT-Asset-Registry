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

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  let priceFeedAddress = process.env.CHAINLINK_PRICE_FEED || "";
  let functionsRouterAddress = process.env.CHAINLINK_FUNCTIONS_ROUTER || "";

  if (chainId === 11155111) {
    // Sepolia Testnet defaults
    priceFeedAddress = priceFeedAddress || "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    functionsRouterAddress = functionsRouterAddress || "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  } else {
    // Local / Hardhat network: Deploy MockV3Aggregator
    console.log("\n0. Deploying MockV3Aggregator for local network...");
    const MockFactory = await ethers.getContractFactory("MockV3Aggregator");
    const mockAggregator = await MockFactory.deploy(8, 3000n * 10n ** 8n); // $3000 / ETH
    await mockAggregator.waitForDeployment();
    priceFeedAddress = await mockAggregator.getAddress();
    functionsRouterAddress = ethers.ZeroAddress;
    console.log(" MockV3Aggregator deployed at:", priceFeedAddress);
  }

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
  const identityRegistry = await IdentityRegistryFactory.deploy(functionsRouterAddress);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log(" IdentityRegistry deployed at:", identityRegistryAddress);

  // 3. Deploy AssetNFT with Chainlink Price Feed
  console.log("\n3. Deploying AssetNFT...");
  const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFTFactory.deploy(
    accessControlAddress,
    identityRegistryAddress,
    priceFeedAddress
  );
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
    network: network.name,
    chainId: chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AccessControlManager: accessControlAddress,
      IdentityRegistry: identityRegistryAddress,
      AssetNFT: assetNFTAddress,
      ChainlinkPriceFeed: priceFeedAddress,
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
