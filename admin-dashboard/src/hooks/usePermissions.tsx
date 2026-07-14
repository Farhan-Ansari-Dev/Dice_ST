import { useAuthStore } from '../store/authStore'

export const usePermissions = () => {
  const { user } = useAuthStore()
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
