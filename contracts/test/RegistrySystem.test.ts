import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AccessControlManager,
  IdentityRegistry,
  AssetNFT,
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

  const sampleDid1 = "did:ethr:0x1111111111111111111111111111111111111111";
  const sampleDid2 = "did:ethr:0x2222222222222222222222222222222222222222";
  const samplePubKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user_1"));
  const samplePubKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes("pubkey_user_2"));
  const sampleTokenURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json";

  beforeEach(async function () {
    [admin, manager, auditor, user1, user2, nonManager] = await ethers.getSigners();

    // 1. Deploy AccessControlManager
    const AccessControlFactory = await ethers.getContractFactory("AccessControlManager");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // 2. Deploy IdentityRegistry
    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy();
    await identityRegistry.waitForDeployment();

    // 3. Deploy AssetNFT
    const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetNFTFactory.deploy(
      await accessControl.getAddress(),
      await identityRegistry.getAddress()
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

      // Admin grants USER_ROLE to user1
      await expect(accessControl.connect(admin).grantRole(USER_ROLE, user1.address))
        .to.emit(accessControl, "RoleGranted")
        .withArgs(USER_ROLE, user1.address, admin.address);

      expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.true;

      // Admin revokes USER_ROLE from user1
      await expect(accessControl.connect(admin).revokeRole(USER_ROLE, user1.address))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(USER_ROLE, user1.address, admin.address);

      expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.false;
    });

    it("Non-admin (e.g. manager) cannot grant roles (full role hierarchy enforcement)", async function () {
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

      const hasAuditorOrUser = await accessControl.hasAnyRole(manager.address, [
        AUDITOR_ROLE,
        USER_ROLE,
      ]);
      expect(hasAuditorOrUser).to.be.false;
    });

    it("hasAnyRole reverts with InvalidAddress if querying zero address", async function () {
      const MANAGER_ROLE = await accessControl.MANAGER_ROLE();
      await expect(
        accessControl.hasAnyRole(ethers.ZeroAddress, [MANAGER_ROLE])
      ).to.be.revertedWithCustomError(accessControl, "InvalidAddress");
    });
  });

  describe("2.2 IdentityRegistry", function () {
    it("Allows registration of a DID and emits IdentityCreated", async function () {
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
      expect(registeredAt).to.be.gt(0);
    });

    it("Reverts with EmptyDID if didUri is empty", async function () {
      await expect(
        identityRegistry.connect(user1).registerIdentity("", samplePubKeyHash1)
      ).to.be.revertedWithCustomError(identityRegistry, "EmptyDID");
    });

    it("Reverts with AlreadyRegistered on duplicate registration attempt", async function () {
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);

      await expect(
        identityRegistry.connect(user1).registerIdentity("did:ethr:duplicate", samplePubKeyHash1)
      ).to.be.revertedWithCustomError(identityRegistry, "AlreadyRegistered");
    });

    it("Reverts with NotRegistered when resolving an unregistered address", async function () {
      expect(await identityRegistry.isRegistered(user2.address)).to.be.false;

      await expect(
        identityRegistry.resolveDID(user2.address)
      ).to.be.revertedWithCustomError(identityRegistry, "NotRegistered");

      await expect(
        identityRegistry.getIdentity(user2.address)
      ).to.be.revertedWithCustomError(identityRegistry, "NotRegistered");
    });
  });

  describe("2.3 AssetNFT & Cross-cutting Invariants", function () {
    beforeEach(async function () {
      // Register user1 and user2 identities
      await identityRegistry.connect(user1).registerIdentity(sampleDid1, samplePubKeyHash1);
      await identityRegistry.connect(user2).registerIdentity(sampleDid2, samplePubKeyHash2);
    });

    it("Non-manager cannot mint (reverts with UnauthorizedManager)", async function () {
      await expect(
        assetNFT.connect(nonManager).mintToIdentity(user1.address, sampleTokenURI)
      ).to.be.revertedWithCustomError(assetNFT, "UnauthorizedManager");
    });

    it("Minting to an unregistered address reverts with RecipientNotRegistered", async function () {
      await expect(
        assetNFT.connect(manager).mintToIdentity(nonManager.address, sampleTokenURI)
      ).to.be.revertedWithCustomError(assetNFT, "RecipientNotRegistered");
    });

    it("Manager can mint to a registered identity, emitting AssetAllocated and incrementing tokenId", async function () {
      const tx = await assetNFT.connect(manager).mintToIdentity(user1.address, sampleTokenURI);
      const receipt = await tx.wait();

      // Check gas usage
      expect(receipt?.gasUsed).to.be.gt(0);
      console.log(`      Gas used for mintToIdentity: ${receipt?.gasUsed.toString()}`);

      await expect(tx)
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(1, ethers.ZeroAddress, user1.address);

      expect(await assetNFT.ownerOf(1)).to.equal(user1.address);
      expect(await assetNFT.tokenURI(1)).to.equal(sampleTokenURI);
      expect(await assetNFT.currentOwnerDID(1)).to.equal(sampleDid1);

      // Mint second token
      const tx2 = await assetNFT.connect(manager).mintToIdentity(user2.address, sampleTokenURI);
      await expect(tx2)
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(2, ethers.ZeroAddress, user2.address);

      expect(await assetNFT.ownerOf(2)).to.equal(user2.address);
      expect(await assetNFT.currentOwnerDID(2)).to.equal(sampleDid2);
    });

    it("Transferring an asset emits AssetAllocated with correct from/to and updates currentOwnerDID", async function () {
      await assetNFT.connect(manager).mintToIdentity(user1.address, sampleTokenURI);

      // user1 transfers token 1 to user2
      const tx = await assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1);
      const receipt = await tx.wait();
      console.log(`      Gas used for transferFrom: ${receipt?.gasUsed.toString()}`);

      await expect(tx)
        .to.emit(assetNFT, "AssetAllocated")
        .withArgs(1, user1.address, user2.address);

      expect(await assetNFT.ownerOf(1)).to.equal(user2.address);
      expect(await assetNFT.currentOwnerDID(1)).to.equal(sampleDid2);
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
        AssetNFTFactory.deploy(ethers.ZeroAddress, await identityRegistry.getAddress())
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAddress");

      await expect(
        AssetNFTFactory.deploy(await accessControl.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(assetNFT, "InvalidAddress");
    });
  });
});
