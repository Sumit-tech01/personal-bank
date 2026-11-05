import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Cloud sync is deliberately generic: every local entity is stored as one
 * document scoped to the owner derived from the device's private sync token.
 * This keeps ownership enforcement in one place and makes adding a new record
 * type impossible to forget on the server.
 */
export interface ISyncRecord extends Document {
  ownerId: string;
  recordId: string;
  entity: string;
  updatedAt: string;
  version?: number;
  serverUpdatedAt?: Date;
  data: Record<string, unknown>;
  createdAt: Date;
  lastSeenAt: Date;
}

const SyncRecordSchema = new Schema<ISyncRecord>(
  {
    ownerId: { type: String, required: true, index: true },
    recordId: { type: String, required: true },
    entity: { type: String, required: true },
    updatedAt: { type: String, required: true },
    version: { type: Number, default: 1 },
    serverUpdatedAt: { type: Date, default: Date.now },
    data: { type: Schema.Types.Mixed, required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SyncRecordSchema.index({ ownerId: 1, recordId: 1 }, { unique: true });
SyncRecordSchema.index({ ownerId: 1, updatedAt: 1 });
SyncRecordSchema.index({ ownerId: 1, entity: 1 });
SyncRecordSchema.index({ ownerId: 1, entity: 1, updatedAt: 1 });
SyncRecordSchema.index({ ownerId: 1, "data.deletedAt": 1 });
SyncRecordSchema.index({ lastSeenAt: 1 });

export const SyncRecordModel: Model<ISyncRecord> =
  (mongoose.models.SyncRecord as Model<ISyncRecord>) ||
  mongoose.model<ISyncRecord>("SyncRecord", SyncRecordSchema);

export { Types };
