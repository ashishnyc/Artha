function Sidebar() {
  return (
    <aside
      className="w-64 h-full bg-gray-900 text-white flex flex-col shrink-0"
      data-testid="sidebar"
    >
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-semibold tracking-wide">Artha</span>
      </div>
    </aside>
  )
}

export default Sidebar
