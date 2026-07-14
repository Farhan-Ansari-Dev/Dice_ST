import { Schema, model } from 'mongoose';

export interface IInspection {
  _id?: any;
  inspection_number: string;
  org_id: any;
  client_id: any;
  product_id?: any;
  product_name?: string;
  inspection_type: 'factory' | 'product' | 'process' | 'audit';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  scheduled_date?: Date;
  completion_date?: Date;
  assigned_to?: any;
  location?: string;
  remarks?: string;
  documents?: string[];
  findings?: string;
  recommendations?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const InspectionSchema = new Schema<IInspection>({
  inspection_number: { type: String, required: true, unique: true },
  org_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  client_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_name: String,
  inspection_type: {
    type: String,
    enum: ['factory', 'product', 'process', 'audit'],
    default: 'factory',
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  scheduled_date: Date,
  completion_date: Date,
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  location: String,
  remarks: String,
  documents: [String],
  findings: String,
  recommendations: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const Inspection = model<IInspection>('Inspection', InspectionSchema);
