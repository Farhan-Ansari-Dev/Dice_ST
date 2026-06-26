import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export const formatDate = (date: string | Date, pattern = 'dd MMM yyyy') => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern)
}

export const formatRelative = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export const formatNumber = (n: number) => new Intl.NumberFormat('en-IN').format(n)

export const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

export const truncate = (str: string, len = 60) =>
  str.length > len ? str.slice(0, len) + '…' : str

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
