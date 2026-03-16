import { Navigate, Outlet } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

function ProtectedRoute() {
  const token = useAppStore((s) => s.auth.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export default ProtectedRoute
