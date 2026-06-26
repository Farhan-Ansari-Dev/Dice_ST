import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  org_id: Types.ObjectId;
  application_id?: Types.ObjectId;

  title: string;
  description?: string;
  assigned_to: Types.ObjectId;
  assigned_by: Types.ObjectId;

  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

  due_at?: Date;
  completed_at?: Date;

  checklist: Array<{ item: string; done: boolean; done_at?: Date }>;
  attachments: Types.ObjectId[];   // Document refs

  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    org_id:         { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    application_id: { type: Schema.Types.ObjectId, ref: 'Application', index: true },

    title:       { type: String, required: true, trim: true },
    description: String,
    assigned_to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assigned_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    status:   { type: String, enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'], default: 'todo', index: true },

    due_at:       { type: Date, index: true },
    completed_at: Date,

    checklist: [{
      item:    { type: String, required: true },
      done:    { type: Boolean, default: false },
      done_at: Date,
      _id: false,
    }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],

    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskSchema.index({ assigned_to: 1, status: 1, due_at: 1 });
TaskSchema.index({ org_id: 1, status: 1, created_at: -1 });

TaskSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Task = model<ITask>('Task', TaskSchema);
