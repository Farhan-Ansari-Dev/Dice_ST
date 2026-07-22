/**
 * Encrypted provider API keys.
 *
 * Kept out of RemoteConfig deliberately: RemoteConfig is read on a public,
 * cached endpoint, and a secret stored there is one serialisation mistake away
 * from being served to every mobile client. This collection is never returned
 * by any route — see credentialService for the only read path.
 */
import { Schema, model, Document, Types } from 'mongoose';

export type ProviderName = 'nvidia' | 'openai' | 'claude' | 'gemini' | 'ollama' | 'azure';

export const PROVIDER_NAMES: ProviderName[] = ['nvidia', 'openai', 'claude', 'gemini', 'ollama', 'azure'];

export interface IAIProviderCredential extends Document {
  provider: ProviderName;
  ciphertext: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
  key_version: number;
  /** Display only — the last four characters of the key. */
  last4: string;
  rotated_at: Date;
  rotated_by?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const AIProviderCredentialSchema = new Schema<IAIProviderCredential>(
  {
    provider:    { type: String, required: true, unique: true, enum: PROVIDER_NAMES },
    ciphertext:  { type: Buffer, required: true },
    iv:          { type: Buffer, required: true },
    auth_tag:    { type: Buffer, required: true },
    key_version: { type: Number, required: true, default: 1 },
    last4:       { type: String, required: true },
    rotated_at:  { type: Date, default: Date.now },
    rotated_by:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// Belt and braces: even if this document is accidentally passed to a
// serialiser, the secret material does not survive the conversion.
function stripSecrets(_doc: unknown, ret: any) {
  delete ret.ciphertext;
  delete ret.iv;
  delete ret.auth_tag;
  return ret;
}
AIProviderCredentialSchema.set('toJSON', { transform: stripSecrets });
AIProviderCredentialSchema.set('toObject', { transform: stripSecrets });

export const AIProviderCredential = model<IAIProviderCredential>(
  'AIProviderCredential',
  AIProviderCredentialSchema,
);
