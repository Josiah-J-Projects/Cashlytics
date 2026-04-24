import React, { useState } from 'react'
import { useStore, fmt, CATEGORY_COLORS, monthlyAmount, useDevStore } from '../store/index.js'
import { Modal, FormGroup } from '../components/Modal.jsx'
import { DraggableList } from '../components/DraggableList.jsx'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'

//check form fields
function validate(form) {
  const errs = {}
  if (!form.name?.trim()) errs.name = 'Category name is required'
  if (!form.allocated || isNaN(parseFloat(form.allocated))) errs.allocated = 'Amount is required'
  return errs
}
//custom tooltip for charts
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="customTooltip">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{payload[0]?.payload?.name}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.fill || '#fff' }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

export default function Budget() {
  //get global state
  const { budgetCategories, transactions, incomeStreams, addBudgetCategory, updateBudgetCategory, deleteBudgetCategory, reorderBudgetCategories } = useStore()
  //get time
  const { timeOffset } = useDevStore()
  const now = new Date(Date.now() + timeOffset)

  //local UI state
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', allocated: '', allocationType: 'fixed', color: CATEGORY_COLORS[0] })
  const [formErrors, setFormErrors] = useState({})
  const [expandedCat, setExpandedCat] = useState(null)
  const [showUnused, setShowUnused] = useState(true)

  //calculate monthly income from income streams
  const monthlyIncome = incomeStreams.reduce((s, i) => s + monthlyAmount(i), 0)
  
  //filter transactions for current month
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const thisMonthTxs = transactions.filter(t => {
    try { return isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }) } catch { return false }
  })

  //calculate allocated amount for a category
  const getCatAllocated = (cat) =>
    cat.allocationType === 'percentage' ? monthlyIncome * cat.allocated / 100 : (cat.allocated || 0)

  //calculate total spent in a category
  const getCatSpent = (cat) =>
    Math.abs(thisMonthTxs.filter(t => t.budgetCategory === cat.name && t.amount < 0).reduce((s, t) => s + t.amount, 0))

  //totals
  const totalAllocated = budgetCategories.reduce((s, c) => s + getCatAllocated(c), 0)
  const totalSpent = budgetCategories.reduce((s, c) => s + getCatSpent(c), 0)
  const unusedIncome = monthlyIncome - totalAllocated

  //data for pie chart
  const pieData = budgetCategories.filter(c => getCatAllocated(c) > 0).map((c, i) => ({
    name: c.name, value: getCatAllocated(c), color: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }))
  //add unallocated income slice
  if (showUnused && unusedIncome > 0 && monthlyIncome > 0) {
    pieData.push({ name: 'Unallocated Income', value: unusedIncome, color: '#e2e8f0' })
  }

  //data for bar chart
  const barData = budgetCategories.map((c, i) => {
    const allocated = getCatAllocated(c)
    const spent = getCatSpent(c)
    const diff = allocated - spent
    return {
      name: c.name.length > 11 ? c.name.slice(0,11)+'…' : c.name,
      fullName: c.name,
      allocated, spent,
      underspend: diff >= 0 ? diff : 0,
      overspend: diff < 0 ? Math.abs(diff) : 0,
      color: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }
  })

  //open modal
  const openAdd = () => {
    setEditing(null)
    const nextColor = CATEGORY_COLORS[budgetCategories.length % CATEGORY_COLORS.length]
    setForm({ name: '', allocated: '', allocationType: 'fixed', color: nextColor })
    setFormErrors({})
    setShowModal(true)
  }
  const openEdit = (c) => { setEditing(c); setForm(c); setFormErrors({}); setShowModal(true) }
  const save = () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    if (editing) updateBudgetCategory(editing.id, form)
    else addBudgetCategory(form)
    setShowModal(false)
  }

  const ff = (k, v) => { setForm(f => ({...f,[k]:v})); setFormErrors(e => ({...e,[k]:null})) }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Budget</h1>
          <div className="pageSubtitle">{format(now, 'MMMM yyyy')} · {fmt(totalAllocated)} allocated of {fmt(monthlyIncome)} monthly income</div>
        </div>
        <button className="btn btnPrimary btnSm" onClick={openAdd}><Plus size={14} /> Add Category</button>
      </div>

      {/*summary cards*/}
      <div className="statCards statCards3" style={{ marginBottom: 24 }}>
        <div className="statCard green"><div className="statLabel">Monthly Income</div><div className="statValue">{fmt(monthlyIncome, true)}</div></div>
        <div className="statCard">
          <div className="statLabel">Total Allocated</div>
          <div className="statValue">{fmt(totalAllocated, true)}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>
            {monthlyIncome > 0 ? `${((totalAllocated/monthlyIncome)*100).toFixed(1)}% of income` : ' - '}
          </div>
        </div>
        <div className="statCard">
          <div className="statLabel">Spent This Month</div>
          <div className="statValue" style={{ color: totalSpent > totalAllocated ? 'var(--red-500)' : 'var(--gray-900)' }}>{fmt(totalSpent, true)}</div>
          <div style={{ fontSize: 12, color: unusedIncome < 0 ? 'var(--red-500)' : 'var(--green-600)', marginTop: 6 }}>
            {unusedIncome >= 0 ? `${fmt(unusedIncome)} unallocated` : `${fmt(Math.abs(unusedIncome))} over-allocated`}
          </div>
        </div>
      </div>

      {budgetCategories.length > 0 && (
        <div className="grid2" style={{ marginBottom: 24 }}>
          <div className="chartContainer">
            <div className="cardHeader">
              <div className="cardTitle">Allocation Breakdown</div>
              {monthlyIncome > 0 && unusedIncome > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--gray-500)' }}>
                  <input type="checkbox" checked={showUnused} onChange={e => setShowUnused(e.target.checked)} />
                  Show unallocated
                </label>
              )}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chartContainer">
            <div className="cardHeader">
              <div className="cardTitle">Allocated vs Spent</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ color: 'var(--green-600)' }}>■ Under</span>
                <span style={{ color: 'var(--red-500)' }}>■ Over</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${Math.round(v)}`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={76} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="spent" name="Spent" fill="#94a3b8" radius={[0,4,4,0]} stackId="a" />
                <Bar dataKey="underspend" name="Under Budget" fill="#16a34a" radius={[0,4,4,0]} stackId="a" />
                <Bar dataKey="overspend" name="Over Budget" fill="#ef4444" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {/*check if categories exist*/}
      {budgetCategories.length === 0 ? (
        <div className="emptyState">
          <h3>No budget categories</h3><p>Add categories to track your spending</p>
          <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} /> Add Category</button>
        </div> 
        //category list
      ) : (
        <DraggableList items={budgetCategories} onReorder={reorderBudgetCategories} keyExtractor={c => c.id}
          renderItem={(cat, i, handle) => {
            const allocated = getCatAllocated(cat)
            const spent = getCatSpent(cat)
            const diff = allocated - spent
            const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0
            const catTxs = thisMonthTxs.filter(t => t.budgetCategory === cat.name && t.amount < 0)
              .sort((a,b) => new Date(b.date)-new Date(a.date))
            const isOpen = expandedCat === cat.id

            return (
              <div className="itemCard">
                {/*category header*/}
                <div className="itemCardHeader" onClick={() => setExpandedCat(isOpen ? null : cat.id)}>
                  {handle}
                  <div className="itemCardIcon" style={{ background: `${cat.color}22`, color: cat.color || 'var(--green-600)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  </div>
                  {/*category info*/}
                  <div className="itemCardInfo" style={{ flex: 1 }}>
                    <div className="itemCardName">{cat.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {fmt(spent)} spent of {fmt(allocated)}{cat.allocationType === 'percentage' ? ` (${cat.allocated}%)` : ''}
                    </div>
                    <div className="progressBar" style={{ marginTop: 6 }}>
                      <div className="progressFill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--red-500)' : pct >= 80 ? 'var(--amber-500)' : cat.color || 'var(--green-600)' }} />
                    </div>
                  </div>
                  <div className="itemCardValue">
                    <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 15, color: diff < 0 ? 'var(--red-500)' : 'var(--green-600)' }}>
                      {diff >= 0 ? `+${fmt(diff)}` : fmt(diff)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{diff >= 0 ? 'remaining' : 'over budget'}</div>
                  </div>
                   {/*actions*/}
                  <div className="itemCardActions" onClick={e => e.stopPropagation()}>
                    <button className="btn btnGhost btnIcon" onClick={() => openEdit(cat)}><Edit2 size={15} /></button>
                    <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => deleteBudgetCategory(cat.id)}><Trash2 size={15} /></button>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
                </div>
                {/*expanded transaction list*/}
                {isOpen && (
                  <div className="itemCardDropdown">
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 8 }}>THIS MONTH ({catTxs.length})</div>
                    {catTxs.length === 0
                      ? <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No spending in this category this month</div>
                      : catTxs.map(tx => (
                        <div key={tx.id} className="txRow" style={{ padding: '6px 0' }}>
                          <div className="txInfo"><div className="txName" style={{ fontSize: 13 }}>{tx.name}</div><div className="txMeta">{tx.date}</div></div>
                          <div style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 13, color: 'var(--red-500)' }}>{fmt(tx.amount)}</div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )
          }} />
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Category' : 'Add Budget Category'} onClose={() => setShowModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={save}>{editing ? 'Save' : 'Add'}</button></>}>
          <FormGroup label="Category Name">
            <input className={formErrors.name ? 'inputError' : ''} value={form.name} onChange={e => ff('name', e.target.value)} placeholder="e.g. Groceries, Rent, Entertainment" />
            {formErrors.name && <span className="errorText">{formErrors.name}</span>}
          </FormGroup>
          <div className="formRow">
            <FormGroup label="Allocation Type">
              <select value={form.allocationType} onChange={e => ff('allocationType', e.target.value)}>
                <option value="fixed">Fixed Amount ($)</option>
                <option value="percentage">% of Income</option>
              </select>
            </FormGroup>
            <FormGroup label={form.allocationType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}>
              <input className={formErrors.allocated ? 'inputError' : ''} type="number" value={form.allocated}
                onChange={e => ff('allocated', e.target.value)}
                placeholder={form.allocationType === 'percentage' ? '10' : '500'} step={form.allocationType === 'percentage' ? '1' : '0.01'} />
              {formErrors.allocated && <span className="errorText">{formErrors.allocated}</span>}
            </FormGroup>
          </div>
          <FormGroup label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {CATEGORY_COLORS.map(c => (
                <div key={c} onClick={() => ff('color', c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: form.color === c ? '3px solid var(--gray-900)' : '2px solid transparent',
                  transform: form.color === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s'
                }} />
              ))}
            </div>
          </FormGroup>
          {monthlyIncome > 0 && form.allocated && form.allocationType === 'percentage' && (
            <div style={{ padding: '8px 12px', background: 'var(--green-50)', borderRadius: 8, fontSize: 13, color: 'var(--green-700)' }}>
              = {fmt(monthlyIncome * parseFloat(form.allocated) / 100)} per month
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
