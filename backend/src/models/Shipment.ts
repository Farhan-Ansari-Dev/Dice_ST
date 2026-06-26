import mongoose, { Schema, Document } from 'mongoose';

export interface IShipment extends Document {
  shipment_number: string;
  client_id: mongoose.Types.ObjectId;
  origin: string;
  destination: string;
  status: 'pending' | 'in_transit' | 'customs_clearance' | 'delivered' | 'held' | 'cancelled';
  expected_delivery?: Date;
  documents: Array<{
    name: string;
    url: string;
    uploaded_at: Date;
  }>;
  deleted_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema: Schema = new Schema(
  {
    shipment_number: { type: String, required: true, unique: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'customs_clearance', 'delivered', 'held', 'cancelled'],
      default: 'pending',
    },
    expected_delivery: { type: Date },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
