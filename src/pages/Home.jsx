import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, fmt, monthlyAmount, useDevStore } from '../store/index.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts'
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'

//tooltip for charts
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="customTooltip">
      <div style={{ marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || '#fff', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  //global state
  const { accounts, creditAccounts, transactions, incomeStreams, expenseStreams, budgetCategories } = useStore()
  const { timeOffset } = useDevStore()
  const now = new Date(Date.now() + timeOffset)

  //calculate totals
  const totalAssets = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalDebt = creditAccounts.reduce((s, a) => s + (a.balance || 0) + (a.accruedInterest || 0), 0)
  const netWorth = totalAssets - totalDebt
  const monthlyIncome = incomeStreams.reduce((s, i) => s + monthlyAmount(i), 0)
  const monthlyExpenses = expenseStreams.reduce((s, e) => s + monthlyAmount(e), 0)

  //build last 6 months transaction data for bar chart
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const monthTxs = transactions.filter(t => {
      try { return isWithinInterval(parseISO(t.date), { start, end }) } catch { return false }
    })
    const income = monthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    return { month: format(d, 'MMM'), income, expense }
  })

  //budget pie chart data
  const pieData = budgetCategories
    .filter(c => c.allocated > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.allocationType === 'percentage' ? monthlyIncome * c.allocated / 100 : c.allocated,
      color: c.color || '#16a34a',
    }))

  //calculate total allocated budget and add "unallocated" slice if applicable
  const totalAllocated = pieData.reduce((s, p) => s + p.value, 0)
  const unusedIncome = monthlyIncome - totalAllocated
  if (unusedIncome > 0 && monthlyIncome > 0) {
    pieData.push({ name: 'Unallocated', value: unusedIncome, color: '#e2e8f0' })
  }
  //get most recent 6 transactions
  const recentTxs = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
 
    //combine regular accounts and credit accounts
  const allAccounts = [
    ...accounts.map(a => ({ id: a.id, name: a.name })),
    ...creditAccounts.map(a => ({ id: a.id, name: a.name })),
  ]

  return (
    <div className="page">
      {/*page header*/}
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Dashboard</h1>
          <div className="pageSubtitle">{format(now, 'EEEE, MMMM d, yyyy')}</div>
        </div>
      </div>
      
      {/*stat cards*/}
      <div className="statCards statCards4">
        <div className="statCard green">
          <div className="statLabel">Net Worth</div>
          <div className="statValue">{fmt(netWorth, true)}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,0.65)' }}>Assets - Debt = Net</div>
        </div>
        <div className="statCard">
          <div className="statLabel">Total Assets</div>
          <div className="statValue" style={{ color: 'var(--green-600)' }}>{fmt(totalAssets, true)}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-400)' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="statCard">
          <div className="statLabel">Total Debt</div>
          <div className="statValue" style={{ color: totalDebt > 0 ? 'var(--red-500)' : 'var(--gray-400)' }}>{fmt(totalDebt, true)}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-400)' }}>{creditAccounts.length} credit account{creditAccounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="statCard">
          <div className="statLabel">Monthly Cash Flow</div>
          <div className="statValue" style={{ color: monthlyIncome - monthlyExpenses >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
            {fmt(monthlyIncome - monthlyExpenses, true)}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-400)' }}>
            {fmt(monthlyIncome, true)} income - {fmt(monthlyExpenses, true)} expenses
          </div>
        </div>
      </div>

      {/*charts section*/}
      <div className="grid2" style={{ marginBottom: 24 }}>
        <div className="chartContainer">
          <div className="cardHeader">
            <div className="cardTitle">Recorded Transactions</div>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Last 6 months</span>
          </div>
          {monthlyIncome > 0 && (
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 8 }}>
              Dashed line = projected monthly income ({fmt(monthlyIncome, true)}/mo from streams)
            </div>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} />
              <Tooltip content={<ChartTooltip />} />
              {monthlyIncome > 0 && (
                <ReferenceLine y={monthlyIncome} stroke="#16a34a" strokeDasharray="4 3" strokeOpacity={0.6} />
              )}
              <Bar dataKey="income" fill="#16a34a" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chartContainer">
          <div className="cardHeader">
            <div className="cardTitle">Budget Allocation</div>
            <button className="btn btnGhost btnSm" style={{ fontSize: 12 }} onClick={() => navigate('/budget')}>Manage →</button>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="emptyState" style={{ padding: '40px 0' }}>
              <p>No budget categories set up yet.</p>
              <button className="btn btnPrimary btnSm" style={{ marginTop: 12 }} onClick={() => navigate('/budget')}>Set Up Budget</button>
            </div>
          )}
        </div>
      </div>

      {/*bottom section*/}
      <div className="grid2">
        {/*accounts preview*/}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Accounts</div>
            <button className="btn btnGhost btnSm" style={{ fontSize: 12 }} onClick={() => navigate('/accounts')}>View all →</button>
          </div>
          {accounts.length === 0 ? (
            <div className="emptyState" style={{ padding: '24px 0' }}><p>No accounts yet</p></div>
          ) : accounts.slice(0, 5).map(a => (
            <div key={a.id} className="txRow">
              <div className="txIcon" style={{ background: 'var(--green-50)' }}>
                <Wallet size={16} color="var(--green-600)" />
              </div>
              <div className="txInfo">
                <div className="txName">{a.name}</div>
                <div className="txMeta">{a.category}</div>
              </div>
              <div className="txAmount" style={{ color: 'var(--green-600)' }}>{fmt(a.balance)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent Transactions</div>
            <button className="btn btnGhost btnSm" style={{ fontSize: 12 }} onClick={() => navigate('/transactions')}>View all →</button>
          </div>
          {recentTxs.length === 0 ? (
            <div className="emptyState" style={{ padding: '24px 0' }}><p>No transactions yet</p></div>
          ) : recentTxs.map(tx => {
            const acct = allAccounts.find(a => a.id === tx.accountId)
            return (
              <div key={tx.id} className="txRow">
                <div className="txIcon" style={{ background: tx.amount >= 0 ? 'var(--green-50)' : 'var(--red-100)' }}>
                  {tx.amount >= 0 ? <ArrowUpRight size={16} color="var(--green-600)" /> : <ArrowDownRight size={16} color="var(--red-500)" />}
                </div>
                <div className="txInfo">
                  <div className="txName">{tx.name}</div>
                  <div className="txMeta">{acct?.name || ' - '} · {tx.date}</div>
                </div>
                <div className="txAmount" style={{ color: tx.amount >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
