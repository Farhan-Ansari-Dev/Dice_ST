import { create } from 'zustand';
import documentsService, { Document as ApiDocument } from '../services/documentsService';

export interface VaultDocument {
  id: string;
  name: string;
  uploaded: boolean;
  type: string;
  dateAdded?: string;
  uri?: string;
  mimeType?: string | null;
  source?: 'camera' | 'image-library' | 'file-picker';
  ocrStatus?: 'ready' | 'queued';
  sizeBytes?: number;
  verified?: boolean;
}

interface VaultState {
  documents: VaultDocument[];
  isLoading: boolean;
  error: string | null;
  /** True once a fetch has completed, so the UI can tell "empty" from "not loaded yet". */
  hasLoaded: boolean;

  loadDocuments: () => Promise<void>;
  addDocument: (doc: Omit<VaultDocument, 'id'>) => void;
  markAsUploaded: (id: string) => void;
  reset: () => void;
}

/** Maps the API document shape onto what the vault screens render. */
function toVaultDocument(doc: ApiDocument): VaultDocument {
  return {
    id: doc._id,
    // Anything returned by /documents exists in storage — it is uploaded.
    uploaded: true,
    name: doc.name,
    type: doc.category ?? doc.doc_type ?? 'Document',
    dateAdded: doc.created_at,
    mimeType: null,
    sizeBytes: doc.size_bytes,
    verified: doc.verified,
    ocrStatus: doc.ocr_text ? 'ready' : undefined,
  };
}

export const useVaultStore = create<VaultState>((set) => ({
  // Starts empty. This previously seeded five fabricated documents
  // (Company Incorporation, GST Certificate, ISO 9001, PAN, Udyam) with some
  // marked uploaded:true — so the vault displayed documents the user had never
  // uploaded, and the counters on the vault screen were fiction.
  documents: [],
  isLoading: false,
  error: null,
  hasLoaded: false,

  loadDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await documentsService.getAll();
      const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
      set({ documents: list.map(toVaultDocument), isLoading: false, hasLoaded: true });
    } catch (err: any) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: err?.response?.data?.message ?? 'Could not load your documents.',
      });
    }
  },

  addDocument: (doc) => set((state) => ({
    documents: [
      { ...doc, id: Math.random().toString(36).substring(7), uploaded: true },
      ...state.documents,
    ],
  })),

  markAsUploaded: (id) => set((state) => ({
    documents: state.documents.map((d) => (d.id === id ? { ...d, uploaded: true } : d)),
  })),

  reset: () => set({ documents: [], isLoading: false, error: null, hasLoaded: false }),
}));
