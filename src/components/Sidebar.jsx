import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, CreditCard, PieChart,
  ArrowLeftRight, Calendar, Menu, TrendingUp, Plus
} from 'lucide-react'
import { useAppContext } from '../context/AppContext.jsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/credit', label: 'Credit', icon: CreditCard },
  { to: '/budget', label: 'Budget', icon: PieChart },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
]

export function Sidebar({ open, onClose }) {
  const { openTxModal } = useAppContext()
  return (
    <>
      {open && <div className="sidebarOverlay" onClick={onClose} />}
      <nav className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebarLogo">
          <img src="Logo.png" alt="Cashlytics" />
          <span>Cashlytics</span>
        </div>
        <div className="sidebarAddTx">
          <button className="btn btnPrimary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { openTxModal(); onClose?.() }}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
        <div className="sidebarNav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `navItem${isActive ? ' active' : ''}`}
              onClick={onClose}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </div>
        <div className="sidebarFooter">
          <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />
            Your Finances, Simplified
          </div>
        </div>
      </nav>
    </>
  )
}

export function Topbar({ onMenuClick }) {
  const { openTxModal } = useAppContext()
  return (
    <div className="topbar">
      <button className="btn btnGhost btnIcon" onClick={onMenuClick}>
        <Menu size={20} />
      </button>
      <div className="topbarLogo">
        <img src="Logo.png" alt="Cashlytics" />
        Cashlytics
      </div>
      <button className="btn btnPrimary btnSm" onClick={() => openTxModal()}>
        <Plus size={14} /> Add
      </button>
    </div>
  )
}