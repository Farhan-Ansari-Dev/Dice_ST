import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  resource_type: 'application' | 'document' | 'certification';
  resource_id: Types.ObjectId;
  parent_id?: Types.ObjectId;                       // null = top-level, else reply
  thread_root_id?: Types.ObjectId;                  // denormalized for fast thread queries

  author_id: Types.ObjectId;
  body: string;                                     // markdown supported
  mentions: Types.ObjectId[];                       // user ids @-mentioned

  attachments: Array<{ document_id: Types.ObjectId; label: string }>;

  // System-generated comments (e.g. status changes appear as comments)
  is_system: boolean;
  system_event?: string;                            // "status_changed", "doc_uploaded", etc.

  edited_at?: Date;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    resource_type:  { type: String, enum: ['application', 'document', 'certification'], required: true, index: true },
    resource_id:    { type: Schema.Types.ObjectId, required: true, index: true },
    parent_id:      { type: Schema.Types.ObjectId, ref: 'Comment' },
    thread_root_id: { type: Schema.Types.ObjectId, ref: 'Comment', index: true },

    author_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body:       { type: String, required: true },
    mentions:   [{ type: Schema.Types.ObjectId, ref: 'User' }],

    attachments: [{
      document_id: { type: Schema.Types.ObjectId, ref: 'Document' },
      label:       String,
      _id: false,
    }],

    is_system:    { type: Boolean, default: false },
    system_event: String,

    edited_at:  Date,
    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

CommentSchema.index({ resource_type: 1, resource_id: 1, created_at: -1 });

CommentSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Comment = model<IComment>('Comment', CommentSchema);
