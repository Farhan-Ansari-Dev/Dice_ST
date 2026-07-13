import { create } from 'zustand';

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
}

interface VaultState {
  documents: VaultDocument[];
  addDocument: (doc: Omit<VaultDocument, 'id'>) => void;
  markAsUploaded: (id: string) => void;
}

const DEFAULT_DOCS: VaultDocument[] = [
  { id: '1', name: 'Company Incorporation (CIN)', uploaded: false, type: 'Registration' },
  { id: '2', name: 'GST Certificate', uploaded: true, type: 'Taxation' },
  { id: '3', name: 'ISO 9001:2015 Certificate', uploaded: false, type: 'QMS' },
  { id: '4', name: 'Authorized Signatory PAN', uploaded: true, type: 'Identity' },
  { id: '5', name: 'MSME / Udyam Registration', uploaded: false, type: 'Registration' },
];

export const useVaultStore = create<VaultState>((set) => ({
  documents: DEFAULT_DOCS,
  addDocument: (doc) => set((state) => ({
    documents: [
      { ...doc, id: Math.random().toString(36).substring(7), uploaded: true },
      ...state.documents
    ]
  })),
  markAsUploaded: (id) => set((state) => ({
    documents: state.documents.map(d => d.id === id ? { ...d, uploaded: true } : d)
  }))
}));
