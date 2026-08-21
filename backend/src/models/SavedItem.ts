/**
 * SavedItem — a user's saved/bookmarked Market Access objects.
 *
 * Deliberately minimal and user-scoped: one row per (user, item_type, item_id),
 * so saving is idempotent (duplicate-safe) and a user only ever sees their own
 * saved items. `metadata` holds a small display snapshot (title, country, …) so
 * the saved list renders without N extra fetches; the canonical object is always
 * re-openable via item_id.
 *
 * Extensible by item_type — Market Access opportunities first; products / HS
 * codes / markets can be added later without a schema change.
 */
import { Schema, model, Document, Types } from 'mongoose';

export const SAVED_ITEM_TYPES = ['opportunity'] as const;
export type SavedItemType = (typeof SAVED_ITEM_TYPES)[number];

export interface ISavedItem extends Document {
  user_id: Types.ObjectId;
  item_type: SavedItemType;
  /** Id of the referenced object (e.g. BusinessOpportunity _id) as a string. */
  item_id: string;
  /** Small display snapshot captured at save time. Optional. */
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SavedItemSchema = new Schema<ISavedItem>(
  {
    user_id:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item_type: { type: String, enum: SAVED_ITEM_TYPES, required: true },
    item_id:   { type: String, required: true },
    metadata:  { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// One saved row per user + type + item → toggling and re-saving are idempotent.
SavedItemSchema.index({ user_id: 1, item_type: 1, item_id: 1 }, { unique: true });

export const SavedItem = model<ISavedItem>('SavedItem', SavedItemSchema);
export default SavedItem;
