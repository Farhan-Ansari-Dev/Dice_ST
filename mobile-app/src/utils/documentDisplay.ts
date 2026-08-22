import { Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import documentsService, { Document } from '../services/documentsService';

export interface FileKind {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;      // fixed hex that reads well in light and dark
  label: string;     // short type label, e.g. "PDF"
}

/**
 * Derive a file-type icon/label from a filename (and optional mime type). Purely
 * presentational — uses only the real document name/mime, never invents a type.
 */
export function fileKind(name?: string, mimeType?: string | null): FileKind {
  const ext = (name?.split('.').pop() || '').toLowerCase();
  const m = (mimeType || '').toLowerCase();
  const isExt = (...e: string[]) => e.includes(ext);

  if (m.includes('pdf') || isExt('pdf')) return { icon: 'document-text', tint: '#E5484D', label: 'PDF' };
  if (m.includes('word') || isExt('doc', 'docx')) return { icon: 'document', tint: '#2B6CB0', label: 'DOC' };
  if (m.includes('excel') || m.includes('spreadsheet') || isExt('xls', 'xlsx', 'csv'))
    return { icon: 'grid', tint: '#2F855A', label: isExt('csv') ? 'CSV' : 'XLS' };
  if (m.startsWith('image/') || isExt('jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'))
    return { icon: 'image', tint: '#6C63FF', label: isExt('png') ? 'PNG' : 'IMG' };
  if (isExt('zip', 'rar', '7z')) return { icon: 'archive', tint: '#B7791F', label: 'ZIP' };
  return { icon: 'document-attach', tint: '#718096', label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE' };
}

export interface DocumentCard {
  id: string;
  name: string;
  size: string;
  date: string;
  category?: string;
  docType?: string;
}

const humanSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const fmtDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const toDocumentCard = (d: Document): DocumentCard => ({
  id: d._id,
  name: d.name ?? 'Document',
  size: humanSize(d.size_bytes),
  date: fmtDate(d.created_at),
  category: d.category ?? d.doc_type,
  docType: d.doc_type,
});

/** Fetches a short-lived signed URL from the backend and opens it. Replaces the
 *  old fake "Download" alerts with a real, access-controlled download. */
export const openDocument = async (id: string, name?: string) => {
  try {
    const res = await documentsService.getDownloadUrl(id);
    const url = res?.data?.url;
    if (url) await Linking.openURL(url);
    else Alert.alert('Unavailable', `Could not open ${name ?? 'this document'} right now.`);
  } catch (e: any) {
    Alert.alert('Download failed', e?.response?.data?.message ?? 'Please try again.');
  }
};
