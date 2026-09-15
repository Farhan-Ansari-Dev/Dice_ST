import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, ArrowRight, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

import logoUrl from '../../assets/logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const [step, setStep] = useState<'email' | 'otp' | 'mfa' | 'mfa_setup'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  // MFA state
  const [mfaCode, setMfaCode] = useState('')
  const [enrollToken, setEnrollToken] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [setupUri, setSetupUri] = useState('')

  const handleSendOTP = async () => {
    if (!email) return
    try {
      setLoading(true)
      await apiClient.post('/auth/send-otp', { email, is_admin_portal: true })
      setStep('otp')
    } catch (e: any) {
      if (e.response?.status === 404 || e.response?.status === 403) {
        toast.error(e.response?.data?.message || 'No account found or unauthorized.')
      } else {
        toast.error('Failed to send OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  const finalizeLogin = (data: any) => {
    const allowedRoles = ['admin', 'super_admin', 'cb', 'employee', 'consultant', 'lab', 'ib']
    if (!allowedRoles.includes(data.user.role)) {
      toast.error('Unauthorized: Admin or Partner access required.')
      return
    }
    login({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      avatar: data.user.avatar_url,
      company: 'Sanyog Conformity Solutions'
    }, data.accessToken, data.refreshToken)
    navigate('/dashboard')
  }

  // Handles both the OTP step and the MFA-challenge step (which re-submits the
  // same email+OTP together with the authenticator code). MFA is enforced by the
  // backend — a session is established ONLY on a fully-authenticated response.
  const handleVerifyOTP = async () => {
    try {
      setLoading(true)
      const res = await apiClient.post('/auth/verify-otp', {
        email,
        otp: otp.join(''),
        totp_code: step === 'mfa' ? mfaCode : undefined,
      })
      finalizeLogin(res.data.data)
    } catch (e: any) {
      const err = e?.response?.data?.error
      if (err === 'mfa_required' || err === 'invalid_mfa') {
        if (err === 'invalid_mfa') toast.error('That authenticator code is not valid.')
        setMfaCode('')
        setStep('mfa')
      } else if (err === 'mfa_enrollment_required') {
        setEnrollToken(e.response.data.enrollToken)
        setStep('mfa_setup')
        void startMfaSetup(e.response.data.enrollToken)
      } else {
        toast.error('Invalid OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  // MFA enrollment (mandatory-but-unenrolled admin). The enrollToken authorizes
  // ONLY the setup/enable endpoints; it is never stored as a session.
  const startMfaSetup = async (token: string) => {
    try {
      const res = await apiClient.post('/mfa/setup', {}, { headers: { Authorization: `Bearer ${token}` } })
      setSetupSecret(res.data.data.secret)
      setSetupUri(res.data.data.otpauthUri)
    } catch {
      toast.error('Could not start MFA setup. Please sign in again.')
      setStep('email')
    }
  }

  const handleEnableMfa = async () => {
    try {
      setLoading(true)
      const res = await apiClient.post('/mfa/enable', { code: mfaCode }, { headers: { Authorization: `Bearer ${enrollToken}` } })
      finalizeLogin(res.data.data)   // enabling returns a full session
    } catch (e: any) {
      const err = e?.response?.data?.error
      if (err === 'invalid_mfa_code') toast.error('That code is not valid. Try again.')
      else if (err === 'no_pending_enrollment') { toast.error('Enrollment already completed. Please sign in again.'); setStep('email') }
      else toast.error('Could not enable MFA. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i: number, v: string) => {
    if (v.length > 1) return
    const next = [...otp]
    next[i] = v
    setOtp(next)
    if (v && i < 5) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus()
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12), transparent 70%)', top: -100, left: -100, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08), transparent 70%)', bottom: -80, right: -80, pointerEvents: 'none' }} />

      <button 
        onClick={toggleTheme}
        style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '40px 36px',
        boxShadow: 'var(--shadow-card)', position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <img src={logoUrl} alt="Sanyog Logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'contain', background: '#fff' }} />
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>Sanyog Conformity</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Admin Dashboard</div>
          </div>
        </div>

        {step === 'mfa' || step === 'mfa_setup' ? (
          <>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
              {step === 'mfa' ? 'Two-factor authentication' : 'Set up two-factor authentication'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 24px' }}>
              {step === 'mfa'
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Add this account to an authenticator app, then enter the 6-digit code to confirm.'}
            </p>

            {step === 'mfa_setup' && setupSecret && (
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 18 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Setup key</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, letterSpacing: 1, wordBreak: 'break-all' }}>{setupSecret}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 8, wordBreak: 'break-all' }}>{setupUri}</div>
              </div>
            )}

            <input
              type="text" inputMode="numeric" value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" maxLength={6} autoFocus
              onKeyDown={e => e.key === 'Enter' && (step === 'mfa' ? handleVerifyOTP() : handleEnableMfa())}
              style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: 22, letterSpacing: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
            />
            <Button onClick={step === 'mfa' ? handleVerifyOTP : handleEnableMfa} loading={loading} style={{ width: '100%' }} icon={<ArrowRight size={14} />}>
              {step === 'mfa' ? 'Verify & Sign In' : 'Confirm & Enable'}
            </Button>
            <button onClick={() => { setStep('email'); setMfaCode(''); setOtp(['', '', '', '', '', '']) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'block', width: '100%', textAlign: 'center' }}>
              ← Start over
            </button>
          </>
        ) : step === 'email' ? (
          <>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 28px' }}>Sign in to your admin account</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your official email"
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-input)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <Button onClick={handleSendOTP} loading={loading} style={{ width: '100%' }} icon={<ArrowRight size={14} />}>
              Send OTP
            </Button>
          </>
        ) : (
          <>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Enter OTP</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 28px' }}>
              6-digit code sent to <strong style={{ color: 'var(--accent-purple)' }}>{email}</strong>
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
              {otp.map((v, i) => (
                <input
                  key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                  value={v} onChange={e => handleOtpChange(i, e.target.value)}
                  maxLength={1}
                  style={{
                    width: 48, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                    background: 'var(--bg-input)', border: `1px solid ${v ? 'var(--accent-purple)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              ))}
            </div>

            <Button onClick={handleVerifyOTP} loading={loading} style={{ width: '100%' }} icon={<ArrowRight size={14} />}>
              Verify & Sign In
            </Button>

            <button onClick={() => setStep('email')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'block', width: '100%', textAlign: 'center' }}>
              ← Back to email
            </button>
          </>
        )}
      </div>
    </div>
  )
}
