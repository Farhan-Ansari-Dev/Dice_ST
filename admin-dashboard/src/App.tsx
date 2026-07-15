import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/common/LoadingScreen'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import ToastContainer from './components/common/ToastContainer'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'))
const CertificationsPage = lazy(() => import('./pages/certifications/CertificationsPage'))
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'))
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'))
const InsightsPage = lazy(() => import('./pages/insights/InsightsPage'))
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'))
const ShipmentsPage = lazy(() => import('./pages/shipments/ShipmentsPage'))
const TestingPage = lazy(() => import('./pages/testing/TestingPage'))
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'))
const AIAssistantPage = lazy(() => import('./pages/ai-assistant/AIAssistantPage'))
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const RemoteConfigPage = lazy(() => import('./pages/settings/RemoteConfigPage'))
const InspectionsPage = lazy(() => import('./pages/inspections/InspectionsPage'))
const CountriesPage = lazy(() => import('./pages/market-access/CountriesPage'))
const OpportunitiesPage = lazy(() => import('./pages/market-access/OpportunitiesPage'))
const MeetingAvailabilityPage = lazy(() => import('./pages/consultants/MeetingAvailabilityPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function ThemedApp() {
  const { theme } = useUIStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="certifications" element={<CertificationsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="testing" element={<TestingPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="remote-config" element={<RemoteConfigPage />} />
            <Route path="inspections" element={<InspectionsPage />} />
            <Route path="market-access/countries" element={<CountriesPage />} />
            <Route path="market-access/opportunities" element={<OpportunitiesPage />} />
            <Route path="consultants/meetings" element={<MeetingAvailabilityPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <ThemedApp />
    </QueryClientProvider>
  )
}
