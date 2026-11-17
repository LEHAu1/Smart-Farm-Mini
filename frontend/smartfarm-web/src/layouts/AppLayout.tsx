import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { ToastProvider } from '../components/common/ToastNotification'

export default function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f8faf7] flex">
        {/* Skip to Main Content for Accessibility */}
        <a href="#main-content" className="skip-link">
          Chuyển tới nội dung chính
        </a>

        {/* Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Application Container */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />

          <main
            id="main-content"
            className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
