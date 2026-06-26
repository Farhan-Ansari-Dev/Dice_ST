import React from 'react'
import { Truck, MapPin, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { formatDate } from '../../utils/formatters'
import apiClient from '../../services/apiClient'

const STATUS_MAP: Record<string, string> = { active: 'active', pending: 'pending', rejected: 'rejected', in_transit: 'active', delivered: 'active', customs_clearance: 'pending' }

export default function ShipmentsPage() {
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await apiClient.get('/shipments')
      return res.data.data
    }
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Shipment Tracking</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Import/export compliance monitoring</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading shipments...</p>
        ) : shipments.map((s: any) => (
          <div key={s._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={18} color="var(--accent-purple)" /></div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{s.shipment_number}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s._id}</div>
                </div>
              </div>
              <Badge status={STATUS_MAP[s.status] || 'pending'} size="sm" />
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Client</div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.client_id?.name || 'N/A'}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Route</div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.origin} → {s.destination}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>ETA</div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.expected_delivery ? formatDate(s.expected_delivery) : 'TBD'}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Status</div><div style={{ color: 'var(--accent-cyan)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.status.toUpperCase()}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
