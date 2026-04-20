import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider, useAppContext } from './context/AppContext.jsx'
import { Sidebar, Topbar } from './components/Sidebar.jsx'
import TransactionModal from './components/TransactionModal.jsx'
import Home from './pages/Home.jsx'
import Accounts from './pages/Accounts.jsx'
import Credit from './pages/Credit.jsx'
import Budget from './pages/Budget.jsx'
import Transactions from './pages/Transactions.jsx'
import CalendarPage from './pages/Calendar.jsx'
import { useStore } from './store/index.js'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { txModalOpen, txModalDate, closeTxModal } = useAppContext()

  return (
    <div className="appLayout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="mainContent">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/credit" element={<Credit />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </div>
      {txModalOpen && <TransactionModal defaultDate={txModalDate} onClose={closeTxModal} />}
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
