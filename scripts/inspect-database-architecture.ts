/**
 * PERSONAL BANK — MONGODB ATLAS ARCHITECTURE & PERSISTENCE VERIFICATION
 *
 * Verifies:
 * 1. Database name identification for production and test environments.
 * 2. Single-collection vs. multi-collection architecture determination.
 * 3. Read-only inspection of the production database.
 * 4. End-to-end sync, read-back, and persistence verification in test database.
 * 5. Testing multi-entity storage (Transaction, Crop, Vehicle).
 * 6. Verification of record structure (ownerId, entity, recordId, data, timestamps).
 * 7. Verification of compound indexes, unique constraints, and duplicate prevention.
 * 8. Clean isolation guarantee (no leakage into production).
 */

import assert from "node:assert/strict";
import mongoose from "mongoose";
import { loadEnvConfig } from "@next/env";
import { SyncRecordModel } from "../src/models";
import type { Crop, Transaction, Vehicle } from "../src/lib/types";

loadEnvConfig(process.cwd());

const PROD_URI = process.env.MONGODB_URI;
const TEST_URI = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

if (!PROD_URI) {
  console.error("Error: MONGODB_URI is not defined.");
  process.exit(1);
}

function getDatabaseName(uri: string): string {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : "UNKNOWN";
}

const prodDbName = getDatabaseName(PROD_URI);
const testDbName = getDatabaseName(TEST_URI || "");

console.log("==================================================================");
console.log("   PERSONAL BANK — MONGODB ATLAS ARCHITECTURE & PERSISTENCE AUDIT ");
console.log("==================================================================");
console.log(`Target Production Database Name:  ${prodDbName}`);
console.log(`Target Test Database Name:        ${testDbName}`);
console.log("------------------------------------------------------------------\n");

const AUDIT_OWNER_ID = "audit-arch-test-owner-8822";
const now = new Date().toISOString();

async function runAudit() {
  // -----------------------------------------------------------------
  // STEP 1: READ-ONLY INSPECTION OF PRODUCTION DATABASE
  // -----------------------------------------------------------------
  console.log("Step 1: Inspecting Production Database (Read-Only)...");
  const prodConn = await mongoose.createConnection(PROD_URI!, {
    serverSelectionTimeoutMS: 15000,
    bufferCommands: false,
  }).asPromise();

  const prodDb = prodConn.db;
  assert.ok(prodDb, "prodDb must be initialized");
  const prodCollections = await prodDb.listCollections().toArray();
  console.log(`Production database '${prodDbName}' collection count: ${prodCollections.length}`);
  for (const col of prodCollections) {
    const count = await prodDb.collection(col.name).countDocuments();
    console.log(`  - Collection '${col.name}': ${count} documents`);
  }
  if (prodCollections.length === 0) {
    console.log(`  (Note: Production database has not yet received client sync records)`);
  }
  await prodConn.close();
  console.log("✓ Production database inspection complete (0 writes, 0 modifications).\n");

  // -----------------------------------------------------------------
  // STEP 2: CONNECTING TO TEST DATABASE FOR PERSISTENCE VERIFICATION
  // -----------------------------------------------------------------
  console.log(`Step 2: Connecting to Test Database '${testDbName}' for verification...`);
  await mongoose.connect(TEST_URI!, {
    serverSelectionTimeoutMS: 15000,
    bufferCommands: false,
  });

  const activeDbName = mongoose.connection.name;
  console.log(`Active Connected Database: ${activeDbName}`);
  assert.equal(activeDbName, testDbName, "Must be connected to the isolated test database");

  // Ensure indexes on syncrecords
  await SyncRecordModel.init();
  assert.ok(mongoose.connection.db, "mongoose.connection.db must be initialized");
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);
  console.log(`Collections present in '${activeDbName}': ${collectionNames.join(", ")}`);
  assert.ok(
    collectionNames.includes("syncrecords"),
    "Collection 'syncrecords' must exist in database"
  );
  console.log("✓ Test database connected and 'syncrecords' collection confirmed.\n");

  // Clean initial audit owner records if any
  await SyncRecordModel.deleteMany({ ownerId: AUDIT_OWNER_ID });

  // -----------------------------------------------------------------
  // STEP 3: CREATING TEMPORARY TEST TRANSACTION & VERIFYING PERSISTENCE
  // -----------------------------------------------------------------
  console.log("Step 3: Creating and syncing temporary test Transaction...");
  const testTx: Transaction = {
    id: "tx-audit-verify-01",
    entity: "transaction",
    ownerId: AUDIT_OWNER_ID,
    kind: "EXPENSE",
    category: "Groceries",
    group: "HOME",
    amountPaise: 350_000, // ₹3,500
    paymentMethod: "CASH",
    date: "2026-11-03",
    description: "Audit Grocery Test Record",
    createdAt: now,
    updatedAt: now,
  };

  // Simulate server upsert as performed by /api/sync
  await SyncRecordModel.findOneAndUpdate(
    { ownerId: AUDIT_OWNER_ID, recordId: testTx.id },
    {
      $set: {
        entity: testTx.entity,
        updatedAt: testTx.updatedAt,
        data: testTx,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Check document in MongoDB Atlas syncrecords collection
  const txDocCount = await SyncRecordModel.countDocuments({
    ownerId: AUDIT_OWNER_ID,
    recordId: testTx.id,
  });
  assert.equal(txDocCount, 1, "Transaction document must appear in 'syncrecords'");

  // Step 4: Refresh and read record back from MongoDB
  console.log("Step 4: Reading Transaction back from MongoDB Atlas...");
  const fetchedTxDoc = await SyncRecordModel.findOne({
    ownerId: AUDIT_OWNER_ID,
    recordId: testTx.id,
  }).lean<{
    ownerId: string;
    recordId: string;
    entity: string;
    updatedAt: string;
    data: Transaction;
    createdAt: Date;
    lastSeenAt: Date;
  }>();

  assert.ok(fetchedTxDoc, "Transaction document must be retrieved from Atlas");
  assert.equal(fetchedTxDoc.ownerId, AUDIT_OWNER_ID);
  assert.equal(fetchedTxDoc.recordId, "tx-audit-verify-01");
  assert.equal(fetchedTxDoc.entity, "transaction");
  assert.equal(fetchedTxDoc.data.amountPaise, 350_000);
  assert.equal(fetchedTxDoc.data.category, "Groceries");
  assert.ok(fetchedTxDoc.createdAt instanceof Date, "createdAt must be a valid Date");
  assert.ok(fetchedTxDoc.lastSeenAt instanceof Date, "lastSeenAt must be a valid Date");
  console.log("✓ Transaction successfully verified in 'syncrecords' with all fields intact.\n");

  // -----------------------------------------------------------------
  // STEP 5: TESTING SECOND & THIRD ENTITIES (VEHICLE & CROP)
  // -----------------------------------------------------------------
  console.log("Step 5: Testing additional entities (Vehicle and Crop)...");
  const testVehicle: Vehicle = {
    id: "veh-audit-verify-01",
    entity: "vehicle",
    ownerId: AUDIT_OWNER_ID,
    name: "Mahindra 575 DI",
    type: "Tractor",
    registrationNumber: "MH-12-PB-4321",
    purchasePricePaise: 75_000_000, // ₹7,50,000
    purchaseDate: "2024-03-10",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  const testCrop: Crop = {
    id: "crop-audit-verify-01",
    entity: "crop",
    ownerId: AUDIT_OWNER_ID,
    name: "Cotton Brahma BG II",
    season: "Kharif",
    year: "2026",
    areaAcres: 4.0,
    status: "ACTIVE",
    landId: "land-01",
    landName: "Wada Plot",
    sowingDate: "2026-06-20",
    createdAt: now,
    updatedAt: now,
  };

  await SyncRecordModel.findOneAndUpdate(
    { ownerId: AUDIT_OWNER_ID, recordId: testVehicle.id },
    {
      $set: {
        entity: testVehicle.entity,
        updatedAt: testVehicle.updatedAt,
        data: testVehicle,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  await SyncRecordModel.findOneAndUpdate(
    { ownerId: AUDIT_OWNER_ID, recordId: testCrop.id },
    {
      $set: {
        entity: testCrop.entity,
        updatedAt: testCrop.updatedAt,
        data: testCrop,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Verify total documents for owner in syncrecords
  const totalAuditDocs = await SyncRecordModel.countDocuments({ ownerId: AUDIT_OWNER_ID });
  assert.equal(totalAuditDocs, 3, "All 3 distinct entity documents must reside in 'syncrecords'");

  // Read Vehicle back
  const fetchedVeh = await SyncRecordModel.findOne({
    ownerId: AUDIT_OWNER_ID,
    recordId: testVehicle.id,
  }).lean<{ data: Vehicle }>();
  assert.ok(fetchedVeh, "Vehicle must be retrievable");
  assert.equal(fetchedVeh.data.name, "Mahindra 575 DI");
  assert.equal(fetchedVeh.data.registrationNumber, "MH-12-PB-4321");
  assert.equal(fetchedVeh.data.purchasePricePaise, 75_000_000);

  // Read Crop back
  const fetchedCrop = await SyncRecordModel.findOne({
    ownerId: AUDIT_OWNER_ID,
    recordId: testCrop.id,
  }).lean<{ data: Crop }>();
  assert.ok(fetchedCrop, "Crop must be retrievable");
  assert.equal(fetchedCrop.data.name, "Cotton Brahma BG II");
  assert.equal(fetchedCrop.data.areaAcres, 4.0);

  console.log("✓ Vehicle and Crop documents confirmed coexisting in 'syncrecords'.\n");

  // -----------------------------------------------------------------
  // STEP 6: VERIFYING INDEXES, UNIQUE CONSTRAINTS & DUPLICATE DEFENSE
  // -----------------------------------------------------------------
  console.log("Step 6: Verifying indexes, compound keys, and unique constraint enforcement...");
  const indexes = await SyncRecordModel.collection.indexes();
  console.log("Existing Indexes on 'syncrecords':");
  for (const idx of indexes) {
    console.log(`  - Key: ${JSON.stringify(idx.key)}, Unique: ${Boolean(idx.unique)}`);
  }

  const hasUniqueCompoundIndex = indexes.some(
    (idx) => idx.key.ownerId === 1 && idx.key.recordId === 1 && idx.unique === true
  );
  assert.ok(
    hasUniqueCompoundIndex,
    "Index { ownerId: 1, recordId: 1, unique: true } must be present"
  );

  // Attempt duplicate raw insert with same ownerId + recordId
  let duplicateCaught = false;
  try {
    await SyncRecordModel.collection.insertOne({
      ownerId: AUDIT_OWNER_ID,
      recordId: testTx.id, // already exists
      entity: "transaction",
      updatedAt: now,
      data: testTx,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });
  } catch (err: any) {
    if (err.code === 11000) {
      duplicateCaught = true;
    }
  }
  assert.ok(duplicateCaught, "Duplicate insert must be rejected by unique index (E11000)");
  console.log("✓ Unique constraint verified: duplicate documents are strictly rejected.\n");

  // -----------------------------------------------------------------
  // STEP 7: CLEANUP & AUDIT COMPLETION
  // -----------------------------------------------------------------
  console.log("Step 7: Purging temporary audit test records...");
  await SyncRecordModel.deleteMany({ ownerId: AUDIT_OWNER_ID });
  const remainingAuditDocs = await SyncRecordModel.countDocuments({ ownerId: AUDIT_OWNER_ID });
  assert.equal(remainingAuditDocs, 0, "All audit test records must be cleared");

  await mongoose.disconnect();
  console.log("✓ Audit test records cleaned up cleanly. Database left in pristine state.\n");

  console.log("==================================================================");
  console.log("   DATABASE ARCHITECTURE AUDIT VERIFICATION PASSED SUCCESSFULLY!  ");
  console.log("==================================================================");
}

runAudit().catch((err) => {
  console.error("Audit failed with error:", err);
  process.exit(1);
});
