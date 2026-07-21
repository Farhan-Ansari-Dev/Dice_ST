// Shared document presentation helpers. File metadata is the single source of
// truth on the current DocumentVersion, so read it from there — never from Document.

export const currentVersion = (doc: any) =>
  (doc?.current_version_id && typeof doc.current_version_id === 'object') ? doc.current_version_id : null

export const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  processing: { label: 'Processing', color: '#FFB347' },
  ready:      { label: 'Ready',      color: '#00C896' },
  failed:     { label: 'Failed',     color: '#FF6B6B' },
}

// Legacy versions (pre-processing_status) are finalized & downloadable → 'ready'.
export const statusOf = (v: any) => STATUS_STYLE[v?.processing_status] ?? STATUS_STYLE.ready
