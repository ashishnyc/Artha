import { createBrowserRouter, Navigate } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/inbox" replace />,
  },
  {
    path: '/inbox',
    element: <div>Inbox</div>,
  },
  {
    path: '/today',
    element: <div>Today</div>,
  },
  {
    path: '/upcoming',
    element: <div>Upcoming</div>,
  },
  {
    path: '/calendar',
    element: <div>Calendar</div>,
  },
  {
    path: '/login',
    element: <div>Login</div>,
  },
])

export default router
