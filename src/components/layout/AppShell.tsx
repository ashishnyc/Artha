import Sidebar from './Sidebar'
import MainContent from './MainContent'

function AppShell() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      data-testid="app-shell"
    >
      <Sidebar />
      <MainContent />
    </div>
  )
}

export default AppShell
