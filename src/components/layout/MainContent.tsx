import { Outlet } from 'react-router-dom'

function MainContent() {
  return (
    <main
      className="flex-1 h-full overflow-y-auto p-6"
      data-testid="main-content"
    >
      <Outlet />
    </main>
  )
}

export default MainContent
