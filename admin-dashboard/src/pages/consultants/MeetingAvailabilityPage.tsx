import React, { useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, ToggleLeft, ToggleRight, Video } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'

const CONSULTANTS = [
  { id: 'scs-boby-kumar', name: 'Boby Kumar', role: 'Operations Manager' },
  { id: 'scs-sunil-kumar', name: 'Sunil Kumar', role: 'Technical Manager' },
]

const formatSlot = (value: string) => new Date(value).toLocaleString('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
})

export default function MeetingAvailabilityPage() {
  const queryClient = useQueryClient()
  const [selectedConsultant, setSelectedConsultant] = useState(CONSULTANTS[0].id)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState('30')

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['meeting_slots'],
    queryFn: async () => (await apiClient.get('/meeting-slots')).data.data ?? [],
  })

  const selectedPerson = CONSULTANTS.find((person) => person.id === selectedConsultant)!
  const selectedSlots = useMemo(() => slots.filter((slot: any) => slot.consultant_id === selectedConsultant), [slots, selectedConsultant])

  const addSlot = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${date}T${time}:00+05:30`)
      const endsAt = new Date(startsAt.getTime() + Number(duration) * 60 * 1000)
      return apiClient.post('/meeting-slots', {
        consultant_id: selectedPerson.id,
        consultant_name: selectedPerson.name,
        consultant_role: selectedPerson.role,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meeting_slots'] }); toast.success('Meeting slot added') },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Unable to add this slot'),
  })

  const updateSlot = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => apiClient.patch(`/meeting-slots/${id}`, { is_available: isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting_slots'] }),
    onError: () => toast.error('Unable to update slot'),
  })

  const deleteSlot = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/meeting-slots/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meeting_slots'] }); toast.success('Slot removed') },
    onError: () => toast.error('Unable to remove slot'),
  })

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>SUPPORT OPERATIONS</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Meeting availability</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Only enabled slots appear in mobile booking. Confirmed bookings remain protected from conflicts.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}><Video size={16} color="var(--accent-purple)" /> Google Meet enabled</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(440px, 1.6fr)', gap: 18, alignItems: 'start' }}>
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}><CalendarClock size={19} color="var(--accent-purple)" /><h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16 }}>Add availability</h3></div>
          <label style={labelStyle}>Specialist</label>
          <select value={selectedConsultant} onChange={(event) => setSelectedConsultant(event.target.value)} style={inputStyle}>
            {CONSULTANTS.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.role}</option>)}
          </select>
          <label style={labelStyle}>Meeting date</label>
          <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Start time</label><input type="time" value={time} onChange={(event) => setTime(event.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Duration</label><select value={duration} onChange={(event) => setDuration(event.target.value)} style={inputStyle}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
          </div>
          <Button icon={<Plus size={15} />} onClick={() => addSlot.mutate()} disabled={addSlot.isPending} style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>{addSlot.isPending ? 'Adding slot...' : 'Add meeting slot'}</Button>
        </section>

        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>{selectedPerson.name}'s schedule</h3><p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>{selectedSlots.length} upcoming slot{selectedSlots.length === 1 ? '' : 's'}</p></div>
            <Clock3 size={19} color="var(--text-muted)" />
          </div>
          {isLoading ? <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Loading schedule...</div> : selectedSlots.length === 0 ? <div style={{ padding: 38, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No slots published. Add a time to make this specialist bookable.</div> : (
            <div>{selectedSlots.map((slot: any) => <div key={slot._id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: slot.is_available ? 'rgba(0,200,150,0.12)' : 'rgba(139,146,165,0.14)', display: 'grid', placeItems: 'center' }}><Clock3 size={18} color={slot.is_available ? '#00C896' : 'var(--text-muted)'} /></div>
              <div style={{ flex: 1 }}><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{formatSlot(slot.starts_at)}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{slot.is_available ? 'Available to book' : 'Hidden from mobile booking'}</div></div>
              <button title={slot.is_available ? 'Disable slot' : 'Enable slot'} onClick={() => updateSlot.mutate({ id: slot._id, isAvailable: !slot.is_available })} style={iconButtonStyle}>{slot.is_available ? <ToggleRight size={22} color="#00C896" /> : <ToggleLeft size={22} color="var(--text-muted)" />}</button>
              <button title="Delete slot" onClick={() => deleteSlot.mutate(slot._id)} style={iconButtonStyle}><Trash2 size={17} color="#FF6B9D" /></button>
            </div>)}</div>
          )}
        </section>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6, marginTop: 14 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }
const iconButtonStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 5, display: 'grid', placeItems: 'center' }
