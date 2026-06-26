// src/hooks/usePermissions.tsx
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * Hook that returns permission booleans based on the logged‑in user's role.
 * Roles: admin, employee, consultant, cb, lab, ib, viewer
 */
export const usePermissions = () => {
  const { user } = useContext(AuthContext)
  const role = user?.role ?? 'viewer'

  const isAdmin = role === 'admin' || role === 'super_admin'
  const isEmployee = role === 'employee'
  const isConsultant = role === 'consultant'
  const isPartner = ['cb', 'lab', 'ib'].includes(role)
  const isViewer = role === 'viewer'

  return {
    canCreate: isAdmin || isEmployee,
    canEdit: isAdmin || isEmployee,
    canDelete: isAdmin,
    canResendInvoice: isAdmin || isEmployee,
    canAddCertificate: isAdmin || isEmployee,
    canAddApplication: isAdmin || isEmployee,
    isConsultant,
    isPartner,
    isViewer,
  }
}
