import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Home from './pages/Home.jsx'
import Accounts from './pages/Accounts.jsx'
import Credit from './pages/Credit.jsx'
import Budget from './pages/Budget.jsx'
import Transactions from './pages/Transactions.jsx'
import CalendarPage from './pages/Calendar.jsx'

function Layout() {
  return (
    <div className="appLayout">
      <div className="mainContent">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/credit" element={<Credit />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/calendar" element={<CalendarPage />} />
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