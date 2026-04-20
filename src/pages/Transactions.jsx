import React, { useState, useMemo } from 'react'
import { useStore, fmt, todayStr } from '../store/index.js'
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react'
import TransactionModal from '../components/TransactionModal.jsx'
import { format } from 'date-fns'

export default function Transactions() {
  //get data and actions from global store
  const { accounts, creditAccounts, budgetCategories, transactions, deleteTransaction } = useStore()
  //UI state
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')

  //combine regular and credit accounts into one list
  const allAccounts = [
    ...accounts.map(a => ({ id: a.id, name: a.name })),
    ...creditAccounts.map(a => ({ id: a.id, name: a.name })),
  ]
  //filter and sort transactions based on user input
  const filtered = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
        if (filterAccount && t.accountId !== filterAccount) return false
        if (filterCategory && t.budgetCategory !== filterCategory) return false
        if (filterType === 'income' && t.amount <= 0) return false
        if (filterType === 'expense' && t.amount >= 0) return false
        return true
      })
      // sort by date (newest first), fallback to creation time
      .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt||0) - new Date(a.createdAt||0))
  }, [transactions, search, filterAccount, filterCategory, filterType])

  //grouped transactions
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t) })
    // convert to an array and sort by date
    return Object.entries(groups).sort((a,b) => new Date(b[0]) - new Date(a[0]))
  }, [filtered])

  //calculate totals
  const totalIncome = filtered.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0)

  return (
    <div className="page">
      {/* header */}
      <div className="pageHeader">
        <div><h1 className="pageTitle">Transactions</h1>
        <div className="pageSubtitle">{filtered.length} of {transactions.length} transactions</div></div>
        {/*open modal to add transaction*/}
        <button className="btn btnPrimary" onClick={() => setShowModal(true)}><Plus size={16} /> Add Transaction</button>
      </div>

      {/* overall stats */}
      <div className="statCards statCards3" style={{ marginBottom: 20 }}>
        <div className="statCard"><div className="statLabel">Net Income</div><div className="statValue">{fmt(totalIncome - totalExpenses, true)}</div></div>
        <div className="statCard"><div className="statLabel">Income</div><div className="statValue" style={{ color: 'var(--green-600)' }}>{fmt(totalIncome, true)}</div></div>
        <div className="statCard"><div className="statLabel">Expenses</div><div className="statValue" style={{ color: 'var(--red-500)' }}>{fmt(totalExpenses, true)}</div></div>
      </div>

      {/* filters */}
      <div className="filterBar">
        {/* search bar */}
        <div style={{ position: 'relative', flex: 2, minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…" style={{ paddingLeft: 36 }} />
        </div>
        {/* account filter */}
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">All Accounts</option>
          {allAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {/* category filter */}
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {budgetCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {/* type filter */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
      </div>

      {/* empty state */}
      {grouped.length === 0 ? (
        <div className="emptyState">
          <h3>No transactions found</h3>
          <p>{transactions.length === 0 ? 'Add your first transaction to get started' : 'Try adjusting your filters'}</p>
          {/* show add button if no transactions exist */}
          {transactions.length === 0 && <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}><Plus size={16} /> Add Transaction</button>}
        </div>
      ) : grouped.map(([date, txs]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, padding: '0 4px' }}>
            {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
          </div>
          {/*transaction list */}
          <div className="card" style={{ padding: '4px 20px' }}>
            {txs.map(tx => {
              const acct = allAccounts.find(a => a.id === tx.accountId)
              return (
                <div key={tx.id} className="txRow">
                  {/*income vs expense icon*/}
                  <div className="txIcon" style={{ background: tx.amount >= 0 ? 'var(--green-50)' : 'var(--red-100)', borderRadius: 10, width: 40, height: 40 }}>
                    {tx.amount >= 0 ? <ArrowUpRight size={18} color="var(--green-600)" /> : <ArrowDownRight size={18} color="var(--red-500)" />}
                  </div>
                  {/*transaction info*/}
                  <div className="txInfo">
                    <div className="txName">{tx.name}</div>
                    <div className="txMeta">{acct?.name || ' - '}{tx.budgetCategory ? ` · ${tx.budgetCategory}` : ''}{tx.note ? ` · ${tx.note}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="txAmount" style={{ color: tx.amount >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                      {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                    </div>
                    {/* delete transaction */}
                    <button className="btn btnGhost btnIcon" style={{ color: 'var(--gray-400)' }}
                      onClick={() => { if (confirm(`Delete "${tx.name}"?`)) deleteTransaction(tx.id) }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {showModal && <TransactionModal defaultDate={todayStr()} onClose={() => setShowModal(false)} />}
    </div>
  )
}
