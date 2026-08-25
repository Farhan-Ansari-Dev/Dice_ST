import mongoose, { Schema, Document } from 'mongoose';

export interface ITesting extends Document {
  sample_id: string;
  client_id: mongoose.Types.ObjectId;
  application_id?: mongoose.Types.ObjectId;   // links the lab test to its Application workflow
  product_name: string;
  standard?: string;
  lab_name?: string;
  expected_completion?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  report_file?: string;
  deleted_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TestingSchema: Schema = new Schema(
  {
    sample_id: { type: String, required: true, unique: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    application_id: { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    product_name: { type: String, required: true },
    // Optional at intake: a customer test request has no lab/standard yet — a
    // manager assigns them during triage. Staff-created tests still supply them.
    standard: { type: String },
    lab_name: { type: String },
    expected_completion: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    report_file: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Testing = mongoose.model<ITesting>('Testing', TestingSchema);
