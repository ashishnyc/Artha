import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import TaskListPage from './pages/TaskListPage'
import TodayPage from './pages/TodayPage'
import UpcomingPage from './pages/UpcomingPage'
import TagPage from './pages/TagPage'
import LoginPage from './pages/LoginPage'

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/inbox" replace />,
          },
          {
            path: 'inbox',
            element: <div>Inbox</div>,
          },
          {
            path: 'today',
            element: <TodayPage />,
          },
          {
            path: 'upcoming',
            element: <UpcomingPage />,
          },
          {
            path: 'calendar',
            element: <div>Calendar</div>,
          },
          {
            path: 'list/:listId',
            element: <TaskListPage />,
          },
          {
            path: 'completed',
            element: <div>Completed</div>,
          },
          {
            path: 'tag/:tag',
            element: <TagPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
])

export default router
