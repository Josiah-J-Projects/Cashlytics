import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Home from './pages/Home.jsx'
import Accounts from './pages/Accounts.jsx'
import Credit from './pages/Credit.jsx'
import Budget from './pages/Budget.jsx'
import Transactions from './pages/Transactions.jsx'
import CalendarPage from './pages/Calendar.jsx'
import { Sidebar, Topbar } from './components/Sidebar.jsx'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="appLayout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="mainContent">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
          ...
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  )
}

