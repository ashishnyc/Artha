import Sidebar from './Sidebar'
import MainContent from './MainContent'
import TaskDetailPanel from '../tasks/TaskDetailPanel'

function AppShell() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      data-testid="app-shell"
    >
      <Sidebar />
      <MainContent />
      <TaskDetailPanel />
    </div>
  )
}

export default AppShell
