import { Outlet } from 'react-router-dom'

function MainContent() {
  return (
    <main
      className="flex-1 h-full overflow-y-auto pt-14 md:pt-0 px-0 md:p-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
      data-testid="main-content"
    >
      <Outlet />
    </main>
  )
}

export default MainContent
