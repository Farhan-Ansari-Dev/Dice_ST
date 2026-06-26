import React, { useState } from 'react'
import { Shield, Bell, Database, Key, Globe, Palette } from 'lucide-react'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import { useAuthStore } from '../../store/authStore'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const SECTIONS = [
  { icon: Shield, label: 'Profile', id: 'profile' },
  { icon: Bell, label: 'Notifications', id: 'notifications' },
  { icon: Key, label: 'Security', id: 'security' },
  { icon: Globe, label: 'Integrations', id: 'integrations' },
  { icon: Palette, label: 'Appearance', id: 'appearance' },
  { icon: Database, label: 'Data & Storage', id: 'data' },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState('profile')

  const Toggle = ({ defaultOn = false }: { defaultOn?: boolean }) => {
    const [on, setOn] = useState(defaultOn)
    return (
      <button onClick={() => setOn(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? 'var(--accent-purple)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, left: on ? 21 : 3, transition: 'left 0.2s' }} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {SECTIONS.map(({ icon: Icon, label, id }) => (
            <button key={id} onClick={() => setActive(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: active === id ? 'rgba(108,99,255,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${active === id ? 'var(--accent-purple)' : 'transparent'}`, color: active === id ? 'var(--accent-purple)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: active === id ? 600 : 400 }}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {active === 'profile' && (
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const btn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
              try {
                if (btn) btn.disabled = true;
                const newName = (document.getElementById('profileName') as HTMLInputElement).value;
                const avatarInput = document.getElementById('avatarUpload') as HTMLInputElement;
                let avatarBase64 = user?.avatar;
                
                if (avatarInput.files && avatarInput.files[0]) {
                  const file = avatarInput.files[0];
                  if (file.size > 2 * 1024 * 1024) throw new Error('Image size must be less than 2MB');
                  avatarBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                }
                
                const payload: any = { name: newName };
                if (avatarBase64) payload.avatar_url = avatarBase64;

                const res = await apiClient.put('/users/me', payload);
                useAuthStore.getState().updateUser({ name: res.data.data.name, avatar: res.data.data.avatar_url });
                toast.success('Profile updated successfully');
              } catch (err: any) {
                const msg = err.response?.data?.message || err.message;
                toast.error(`Failed to update profile: ${msg}`);
              } finally {
                if (btn) btn.disabled = false;
              }
            }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}
          >
            <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Profile Settings</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              {user && <Avatar name={user.name} src={user.avatar} size={64} />}
              <div>
                <input type="file" id="avatarUpload" accept="image/jpeg, image/png" hidden onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const url = URL.createObjectURL(e.target.files[0]);
                    useAuthStore.getState().updateUser({ avatar: url }); // Optimistic UI update
                  }
                }} />
                <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('avatarUpload')?.click()}>Change Avatar</Button>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '6px 0 0' }}>JPG, PNG max 2MB</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Full Name</label>
                <input id="profileName" defaultValue={user?.role === 'super_admin' ? 'Sachin Misha' : (user?.name ?? '')} disabled={user?.role === 'super_admin'} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', opacity: user?.role === 'super_admin' ? 0.6 : 1 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
                <input id="profileEmail" defaultValue={user?.email ?? ''} disabled style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Company</label>
                <input id="profileCompany" defaultValue={user?.company ?? ''} disabled style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Role</label>
                <input id="profileRole" defaultValue={user?.role ?? ''} disabled style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <Button id="saveProfileBtn" type="submit">Save Changes</Button>
            </div>
          </form>
        )}

        {active === 'notifications' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Notification Preferences</h3>
            {[
              { label: 'Certificate Expiry Alerts', desc: '30, 15, 7 days before expiry', on: true },
              { label: 'Application Status Updates', desc: 'When application status changes', on: true },
              { label: 'Payment Reminders', desc: 'For pending and overdue invoices', on: true },
              { label: 'BIS/Regulatory Updates', desc: 'New circulars and amendments', on: true },
              { label: 'AI Insight Digest', desc: 'Daily summary of regulatory news', on: false },
              { label: 'System Alerts', desc: 'Maintenance and downtime notices', on: false },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{item.label}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{item.desc}</div></div>
                <Toggle defaultOn={item.on} />
              </div>
            ))}
          </div>
        )}

        {(active === 'security' || active === 'integrations' || active === 'appearance' || active === 'data') && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{SECTIONS.find(s => s.id === active)?.label} Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This section is configured via the backend admin API. Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
