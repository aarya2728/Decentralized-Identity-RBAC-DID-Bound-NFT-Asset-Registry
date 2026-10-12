import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AccessControlManager,
  IdentityRegistry,
  AssetNFT,
  MockV3Aggregator,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Decentralized Identity, RBAC & NFT Asset Registry Test Suite", function () {
  let admin: SignerWithAddress;
  let manager: SignerWithAddress;
  let auditor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let nonManager: SignerWithAddress;

  let accessControl: AccessControlManager;
  let identityRegistry: IdentityRegistry;
  let assetNFT: AssetNFT;
  let mockAggregator: MockV3Aggregator;

  const sampleDid1 = "did:ethr:0x1111111111111111111111111111111111111111";
  const sampleDid2 = "did:ethr:0x2222222222222222222222222222222222222222";
  const samplePubKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user_1"));
  const samplePubKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user_2"));
  const sampleTokenURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json";
  const initialEthPrice = 3000n * 10n ** 8n; // $3,000 with 8 decimals

  beforeEach(async function () {
    [admin, manager, auditor, user1, user2, nonManager] = await ethers.getSigners();

    // 1. Deploy AccessControlManager
    const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // 2. Deploy IdentityRegistry
    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy(ethers.ZeroAddress);
    await identityRegistry.waitForDeployment();

    // 3. Deploy Mock Chainlink Aggregator
    const MockV3AggregatorFactory = await ethers.getContractFactory("MockV3Aggregator");
    mockAggregator = await MockV3AggregatorFactory.deploy(8, initialEthPrice);
    await mockAggregator.waitForDeployment();

    // 4. Deploy AssetNFT
    const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetNFTFactory.deploy(
      await accessControl.getAddress(),
      await identityRegistry.getAddress(),
      await mockAggregator.getAddress()
    );
    await assetNFT.waitForDeployment();

    // Setup roles
    const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
    const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
    await accessControl.connect(admin).grantRole(MANAGER_ROLE, manager.address);
    await accessControl.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
  });

  describe("2.1 AccessControlManager & RBAC Hierarchy", function () {
    it("Admin has DEFAULT_ADMIN_ROLE and can grant/revoke roles", async function () {
      const DEFAULT_ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();
      const USER_ROLE = await accessControl.USER_ROLE();

      expect(await accessControl.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;

      await expect(accessControl.connect(admin).grantRole(USER_ROLE, user1.address))
        .to.emit(accessControl, "RoleGranted")
        .withArgs(USER_ROLE, user1.address, admin.address);

      expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.true;

      await expect(accessControl.connect(admin).revokeRole(USER_ROLE, user1.address))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(USER_ROLE, user1.address, admin.address);

      expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.false;
    });

    it("Non-admin (e.g. manager) cannot grant roles", async function () {
      const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
      const DEFAULT_ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();

      await expect(
        accessControl.connect(manager).grantRole(MANAGER_ROLE, nonManager.address)
      ).to.be.revertedWithCustomError(
        accessControl,
        "AccessControlUnauthorizedAccount"
      ).withArgs(manager.address, DEFAULT_ADMIN_ROLE);
    });

    it("hasAnyRole returns true if account possesses at least one matching role", async function () {
      const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
      const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
      const USER_ROLE = await accessControl.USER_ROLE();

      const hasManagerOrAuditor = await accessControl.hasAnyRole(manager.address, [
        AUDITOR_ROLE,
        MANAGER_ROLE,
      ]);
      expect(hasManagerOrAuditor).to.be.true;

      const hasUserOrAuditor = await accessControl.hasAnyRole(manager.address, [
        USER_ROLE,
        AUDITOR_ROLE,
      ]);
      expect(hasUserOrAuditor).to.be.false;
    });

    it("hasAnyRole reverts with InvalidAddress if checking address(0)", async function () {
      const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
      await expect(
        accessControl.hasAnyRole(ethers.ZeroAddress, [MANAGER_ROLE])
      ).to.be.revertedWithCustomError(accessControl, "InvalidAddress");
    });
  });

  describe("2.2 IdentityRegistry (DID Lifecycle)", function () {
    it("Registers a new identity and emits IdentityCreated event", async function () {
      await expect(
        identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1)
      )
        .to.emit(identityRegistry, "IdentityCreated")
        .withArgs(user1.address, sampleDid1, samplePubKeyHash1);

      expect(await identityRegistry.isRegistered(user1.address)).to.be.true;
      expect(await identityRegistry.resolveDID(user1.address)).to.equal(sampleDid1);

      const [didUri, pubKeyHash, registeredAt] = await identityRegistry.getIdentity(user1.address);
      expect(didUri).to.equal(sampleDid1);
      expect(pubKeyHash).to.equal(samplePubKeyHash1);
      expect(registeredAt).to.be.greaterThan(0);
    });

    it("Reverts if attempting to register twice with the same address", async function () {
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);
      await expect(
        identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1)
      ).to.be.revertedWithCustomError(identityRegistry, "AlreadyRegistered");
    });

    it("Reverts if registering with an empty DID string", async function () {
      await expect(
        identityRegistry.connect(user1).registerIdentity("", samplePubKeyHash1)
      ).to.be.revertedWithCustomError(identityRegistry, "EmptyDID");
    });

    it("Updates an existing identity", async function () {
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);
      const updatedDid = "did:ethr:0x1111111111111111111111111111111111111111:updated";
      const updatedHash = ethers.keccak256(ethers.toUtf8Bytes("updated_key"));

      await expect(identityRegistry.connect(user1).updateIdentity(updatedDid, updatedHash))
        .to.emit(identityRegistry, "IdentityUpdated")
        .withArgs(user1.address, updatedDid, updatedHash);

      expect(await identityRegistry.resolveDID(user1.address)).to.equal(updatedDid);
    });

    it("Revokes an identity and prevents resolution until re-registered", async function () {
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);
      await expect(identityRegistry.connect(user1).revokeIdentity())
        .to.emit(identityRegistry, "IdentityRevoked")
        .withArgs(user1.address);

      expect(await identityRegistry.isRegistered(user1.address)).to.be.false;
      await expect(
        identityRegistry.resolveDID(user1.address)
      ).to.be.revertedWithCustomError(identityRegistry, "NotRegistered");
    });
  });

  describe("2.3 AssetNFT (ERC-721 Export Licenses & Ownership Rules)", function () {
    beforeEach(async function () {
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);
      await identityRegistry.connect(user2).registerIdentity(sampleDid2, samplePubKeyHash2);
    });

    it("Allows MANAGER_ROLE to mint an asset to a registered wallet", async function () {
      await expect(
        assetNFT.connect(manager).mintToIdentity(user1.address, sampleTokenURI)
      )
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(1, ethers.ZeroAddress, user1.address, "", sampleDid1);

      expect(await assetNFT.ownerOf(1)).to.equal(user1.address);
      expect(await assetNFT.tokenURI(1)).to.equal(sampleTokenURI);
      expect(await assetNFT.currentOwnerDID(1)).to.equal(sampleDid1);
    });

    it("Reverts if non-manager attempts to mint", async function () {
      await expect(
        assetNFT.connect(nonManager).mintToIdentity(user1.address, sampleTokenURI)
      ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedManager");
    });

    it("Reverts if manager mints to an unregistered wallet", async function () {
      await expect(
        assetNFT.connect(manager).mintToIdentity(nonManager.address, sampleTokenURI)
      ).to.be.revertedWithCustomError(assetNFT, "RecipientNotRegistered");
    });

    it("Allows safe transfer between two registered identities", async function () {
      await assetNFT.connect(manager).mintToIdentity(user1.address, sampleTokenURI);

      await expect(
        assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1)
      )
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(1, user1.address, user2.address, sampleDid1, sampleDid2);

      expect(await assetNFT.ownerOf(1)).to.equal(user2.address);
      expect(await assetNFT.currentOwnerDID(1)).to.equal(sampleDid2);
    });

    it("Reverts transfer to an unregistered wallet", async function () {
      await assetNFT.connect(manager).mintToIdentity(user1.address, sampleTokenURI);
      await expect(
        assetNFT.connect(user1).transferFrom(user1.address, nonManager.address, 1)
      ).to.be.revertedWithCustomError(assetNFT, "RecipientNotRegistered");
    });

    it("Reverts with EmptyTokenURI if tokenURI is blank", async function () {
      await expect(
        assetNFT.connect(manager).mintToIdentity(user1.address, "")
      ).to.be.revertedWithCustomError(assetNFT, "EmptyTokenURI");
    });

    it("Reverts with InvalidAddress if recipient is address(0)", async function () {
      await expect(
        assetNFT.connect(manager).mintToIdentity(ethers.ZeroAddress, sampleTokenURI)
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAddress");
    });

    it("Reverts in constructor if accessControl or identityRegistry address is address(0)", async function () {
      const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
      await expect(
        AssetNFTFactory.deploy(ethers.ZeroAddress, await identityRegistry.getAddress(), await mockAggregator.getAddress())
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAddress");

      await expect(
        AssetNFTFactory.deploy(await accessControl.getAddress(), ethers.ZeroAddress, await mockAggregator.getAddress())
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAddress");
    });
  });

  describe("2.4 Chainlink Services Integration", function () {
    describe("Chainlink Price Feeds (AssetNFT)", function () {
      it("Fetches the latest ETH price accurately from price feed", async function () {
        const price = await assetNFT.getLatestEthPrice();
        expect(price).to.equal(initialEthPrice);
      });

      it("Converts 1 ETH valuation correctly into USD value with 8 decimals", async function () {
        const oneEthInWei = ethers.parseEther("1.0");
        const usdValue = await assetNFT.getAssetUsdValue(oneEthInWei);
        // 1 ETH @ $3,000 = $3,000 * 10^8
        expect(usdValue).to.equal(3000n * 10n ** 8n);
      });

      it("Converts 2.5 ETH valuation correctly", async function () {
        const twoPointFiveEth = ethers.parseEther("2.5");
        const usdValue = await assetNFT.getAssetUsdValue(twoPointFiveEth);
        // 2.5 * $3,000 = $7,500 * 10^8
        expect(usdValue).to.equal(7500n * 10n ** 8n);
      });

      it("Reverts if price is negative or zero", async function () {
        await mockAggregator.updateAnswer(0);
        await expect(assetNFT.getLatestEthPrice()).to.be.revertedWithCustomError(
          assetNFT,
          "NegativePrice"
        );
      });

      it("Reverts if price data is stale (updatedAt older than 24 hours)", async function () {
        const block = await ethers.provider.getBlock("latest");
        const staleTimestamp = BigInt(block!.timestamp) - 90000n; // > 24 hours ago
        await mockAggregator.updateRoundData(2, initialEthPrice, staleTimestamp);

        await expect(assetNFT.getLatestEthPrice()).to.be.revertedWithCustomError(
          assetNFT,
          "StalePrice"
        );
      });
    });

    describe("Chainlink Automation (AccessControlManager)", function () {
      it("Grants temporary auditor role with valid future expiry", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiry = BigInt(block!.timestamp) + 3600n; // 1 hour in future

        await expect(
          accessControl.connect(admin).grantTemporaryAuditor(user1.address, expiry)
        )
          .to.emit(accessControl, "TemporaryAuditorGranted")
          .withArgs(user1.address, expiry);

        const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
        expect(await accessControl.hasRole(AUDITOR_ROLE, user1.address)).to.be.true;
        expect(await accessControl.auditorExpiry(user1.address)).to.equal(expiry);
      });

      it("checkUpkeep returns false when no temporary auditors have expired", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiry = BigInt(block!.timestamp) + 3600n;
        await accessControl.connect(admin).grantTemporaryAuditor(user1.address, expiry);

        const [upkeepNeeded] = await accessControl.checkUpkeep("0x");
        expect(upkeepNeeded).to.be.false;
      });

      it("checkUpkeep returns true and performUpkeep revokes expired auditor automatically", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiry = BigInt(block!.timestamp) + 100n;
        await accessControl.connect(admin).grantTemporaryAuditor(user1.address, expiry);

        // Fast-forward time past expiration
        await ethers.provider.send("evm_increaseTime", [150]);
        await ethers.provider.send("evm_mine", []);

        const [upkeepNeeded, performData] = await accessControl.checkUpkeep("0x");
        expect(upkeepNeeded).to.be.true;

        const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();
        expect(await accessControl.hasRole(AUDITOR_ROLE, user1.address)).to.be.true;

        // Perform upkeep (called by Chainlink Automation network)
        await expect(accessControl.performUpkeep(performData))
          .to.emit(accessControl, "AuditorExpiredAndRevoked");

        // Role is now revoked
        expect(await accessControl.hasRole(AUDITOR_ROLE, user1.address)).to.be.false;
        expect(await accessControl.auditorExpiry(user1.address)).to.equal(0);

        // Next checkUpkeep should now be false
        const [nextUpkeepNeeded] = await accessControl.checkUpkeep("0x");
        expect(nextUpkeepNeeded).to.be.false;
      });
    });
  });
});
