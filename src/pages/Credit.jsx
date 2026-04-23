import React, { useState } from 'react'
import { useStore, fmt, FREQ_LABELS, calcMinPayment } from '../store/index.js'
import { Modal, FormGroup } from '../components/Modal.jsx'
import { DraggableList } from '../components/DraggableList.jsx'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CreditCard, Plus, ChevronDown, ChevronUp, Edit2, Trash2, AlertCircle, ArrowDownRight, ArrowUpRight, TrendingDown } from 'lucide-react'

//check form fields
function validate(form, type) {
  const errs = {}
  //check name
  if (!form.name?.trim()) errs.name = 'Name is required'
  //check credit limit and interest rate for credit accounts
  if (type === 'credit') {
    if (!form.limit || isNaN(parseFloat(form.limit))) errs.limit = 'Credit limit is required'
    if (!form.interestRate || isNaN(parseFloat(form.interestRate))) errs.interestRate = 'Interest rate is required'
  }
  //check amount for expense streams
  if (type === 'expense') {
    if (!form.amount || isNaN(parseFloat(form.amount))) errs.amount = 'Amount is required'
  }
  return errs
}
//credit card display
function CreditCard2({ account, onEdit, onDelete, transactions, handle }) {
  const [expanded, setExpanded] = useState(false)

  //calculate available credit
  const available = account.limit - account.balance + (account.creditBalance || 0)
  //calculate percent used
  const usedPct = account.limit > 0 ? Math.min((account.balance / account.limit) * 100, 100) : 0
  //filter transactions for this account
  const acctTxs = transactions.filter(t => t.accountId === account.id).sort((a,b) => new Date(b.date)-new Date(a.date))
  const barColor = usedPct > 80 ? 'var(--red-500)' : usedPct > 60 ? 'var(--amber-500)' : 'var(--green-600)'
  //calculate minimum payment
  const minPayment = calcMinPayment(account.balance + (account.accruedInterest || 0))
  //flags for credit balance and interest
  const hasCreditBalance = (account.creditBalance || 0) > 0
  const hasInterest = (account.accruedInterest || 0) > 0

  return (
    <div className="itemCard">
      <div className="itemCardHeader" onClick={() => setExpanded(!expanded)}>
        {handle}
        <div className="itemCardIcon" style={{ background: '#fef2f2', color: 'var(--red-500)' }}><CreditCard size={18} /></div>
        {/*account info*/}
        <div className="itemCardInfo" style={{ flex: 1 }}>
          <div className="itemCardName">{account.name}</div>
          {/*interest rate, grace period, and minimum payment info*/}
          <div className="itemCardMeta">{account.interestRate}% · Grace: {account.gracePeriod || 0}d · Min payment: {fmt(minPayment)}</div>
          {/*account usage bar*/}
          <div className="progressBar" style={{ marginTop: 6 }}>
            <div className="progressFill" style={{ width: `${usedPct}%`, background: barColor }} />
          </div>
          {/*balance summary*/}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
            <span>{fmt(account.balance)} owed</span>
            <span>{fmt(Math.max(available, 0))} available</span>
          </div>
        </div>
        {/*limit display*/}
        <div className="itemCardValue" style={{ minWidth: 110, textAlign: 'right', marginLeft: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>Limit</div>
          <div className="itemCardAmount">{fmt(account.limit)}</div>
          {/* Show credit amount when positive, otherwise show accrued interest */}
          {hasCreditBalance && (
            <div style={{ fontSize: 11, color: 'var(--green-600)', marginTop: 2 }}>+{fmt(account.creditBalance)} credit</div>
          )}
          {!hasCreditBalance && hasInterest && (
            <div style={{ fontSize: 11, color: 'var(--red-500)', marginTop: 2 }}>+{fmt(account.accruedInterest)} interest</div>
          )}
        </div>
        {/*action buttons*/}
        <div className="itemCardActions" onClick={e => e.stopPropagation()}>
          <button className="btn btnGhost btnIcon" onClick={() => onEdit(account)}><Edit2 size={15} /></button>
          <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => onDelete(account.id)}><Trash2 size={15} /></button>
        </div>
        {/*expand toggle*/}
        {expanded ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
      </div>
      {/*expanded section*/}
      {expanded && (
        <div className="itemCardDropdown">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Balance Owed', value: fmt(account.balance), color: 'var(--red-500)' },
              hasCreditBalance
                ? { label: 'Credit Balance', value: fmt(account.creditBalance), color: 'var(--green-600)' }
                : { label: 'Accrued Interest', value: fmt(account.accruedInterest || 0), color: 'var(--amber-500)' },
              { label: 'Min. Payment', value: fmt(minPayment), color: 'var(--gray-600)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--white)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
          {/*transaction list*/}
          {acctTxs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No transactions yet</div>
          ) : acctTxs.map(tx => (
            <div key={tx.id} className="txRow" style={{ padding: '8px 0' }}>
              <div className="txIcon" style={{ width: 30, height: 30, background: tx.amount > 0 ? 'var(--green-50)' : 'var(--red-100)', borderRadius: 8 }}>
                {tx.amount > 0 ? <ArrowUpRight size={14} color="var(--green-600)" /> : <ArrowDownRight size={14} color="var(--red-500)" />}
              </div>
              {/*transaction info*/}  
              <div className="txInfo">
                <div className="txName" style={{ fontSize: 13 }}>{tx.name}</div>
                <div className="txMeta">{tx.date}</div>
              </div>
              {/*transaction amount*/}
              <div className="txAmount" style={{ fontSize: 13, color: tx.amount > 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                {tx.amount > 0 ? 'Payment +' : 'Charge −'}{fmt(Math.abs(tx.amount))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpenseCard({ stream, accounts, creditAccounts, onEdit, onDelete, handle }) {
  const allAccounts = [...accounts.map(a=>({...a,type:'regular'})), ...creditAccounts.map(a=>({...a,type:'credit'}))]
  const account = allAccounts.find(a => a.id === stream.accountId)
  const orphaned = stream.accountId && !account
  return (
    <div className="itemCard">
      <div className="itemCardHeader">
        {handle}
        {/*expense icon*/}
        <div className="itemCardIcon" style={{ background: '#fef2f2', color: 'var(--red-500)' }}><TrendingDown size={18} /></div>
        {/* Show expense name; display warning icon if its linked account no longer exists */}
        <div className="itemCardInfo">
          <div className="itemCardName">{stream.name}{orphaned && <AlertCircle size={14} className="alertIcon" />}</div>
           {/*frequency, account, and category*/}
          <div className="itemCardMeta">
            {FREQ_LABELS[stream.frequency] || stream.frequency}
            {account ? ` · ${account.name}` : orphaned ? ' · Account deleted!' : ''}
            {stream.budgetCategory ? ` · ${stream.budgetCategory}` : ''}
          </div>
        </div>
        {/*expense amount display*/}
        <div className="itemCardValue"><div className="itemCardAmount negative">−{fmt(stream.amount)}</div></div>
        {/*action buttons*/}
        <div className="itemCardActions">
          <button className="btn btnGhost btnIcon" onClick={() => onEdit(stream)}><Edit2 size={15} /></button>
          <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => onDelete(stream.id)}><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  )
}
//default empty credit modal
const EMPTY_C = { name: '', limit: '', interestRate: '', compounding: 'monthly', gracePeriod: '0', accruedInterest: '0', balance: '0' }
//default empty expense modal
const EMPTY_E = { name: '', amount: '', frequency: 'monthly', accountId: '', accountType: 'regular', budgetCategory: '', startDate: '', customEvery: 1, customUnit: 'months' }

export default function Credit() {
  const { accounts, creditAccounts, expenseStreams, transactions, budgetCategories,
    addCreditAccount, updateCreditAccount, deleteCreditAccount,
    addExpenseStream, updateExpenseStream, deleteExpenseStream,
    reorderCreditAccounts, reorderExpenseStreams } = useStore()

  //modal
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingCredit, setEditingCredit] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [creditForm, setCreditForm] = useState(EMPTY_C)
  const [expenseForm, setExpenseForm] = useState(EMPTY_E)
  //errors
  const [creditErrors, setCreditErrors] = useState({})
  const [expenseErrors, setExpenseErrors] = useState({})

  //aggregate credit metrics
  const totalLimit = creditAccounts.reduce((s,a)=>s+(a.limit||0),0)
  const totalUsed = creditAccounts.reduce((s,a)=>s+(a.balance||0),0)
  const totalAvail = creditAccounts.reduce((s,a)=>s+(a.limit||0)-(a.balance||0)+(a.creditBalance||0),0)
  const totalInterest = creditAccounts.reduce((s,a)=>s+(a.accruedInterest||0),0)
  const totalCreditBalance = creditAccounts.reduce((s,a)=>s+(a.creditBalance||0),0)
  
  //percent of limit used
  const usedPct = totalLimit > 0 ? (totalUsed/totalLimit*100).toFixed(1) : 0
  //estimate 30-day interest
  const projected30 = creditAccounts.reduce((sum,a) => sum + (a.balance||0) * (a.interestRate/100/12), 0)
  //combine all accounts for dropdown
  const allAccounts = [...accounts.map(a=>({id:a.id,name:a.name,type:'regular'})), ...creditAccounts.map(a=>({id:a.id,name:a.name,type:'credit'}))]

  //open credit modal
  const openAddCredit = () => { setEditingCredit(null); setCreditForm(EMPTY_C); setCreditErrors({}); setShowCreditModal(true) }
  const openEditCredit = (a) => { setEditingCredit(a); setCreditForm(a); setCreditErrors({}); setShowCreditModal(true) }
  
  //save credit account
  const saveCredit = () => {
    const errs = validate(creditForm, 'credit')
    if (Object.keys(errs).length) { setCreditErrors(errs); return }
    if (editingCredit) updateCreditAccount(editingCredit.id, creditForm)
    else addCreditAccount(creditForm)
    setShowCreditModal(false)
  }

  //open expense modal
  const openAddExpense = () => { setEditingExpense(null); setExpenseForm(EMPTY_E); setExpenseErrors({}); setShowExpenseModal(true) }
  const openEditExpense = (s) => { setEditingExpense(s); setExpenseForm(s); setExpenseErrors({}); setShowExpenseModal(true) }
  //save expense stream
  const saveExpense = () => {
    const errs = validate(expenseForm, 'expense')
    if (Object.keys(errs).length) { setExpenseErrors(errs); return }
    if (editingExpense) updateExpenseStream(editingExpense.id, expenseForm)
    else addExpenseStream(expenseForm)
    setShowExpenseModal(false)
  }
  //update form
  const cf = (k, v) => { setCreditForm(f => ({...f,[k]:v})); setCreditErrors(e => ({...e,[k]:null})) }
  const ef = (k, v) => { setExpenseForm(f => ({...f,[k]:v})); setExpenseErrors(e => ({...e,[k]:null})) }

  //data for pie chart
  const pieData = [
    { name: 'Used', value: totalUsed, color: '#ef4444' },
    { name: 'Available', value: Math.max(totalAvail, 0), color: '#16a34a' },
  ]

  return (
    <div className="page">
      <div className="pageHeader">
        <div><h1 className="pageTitle">Credit</h1><div className="pageSubtitle">Debt accounts and recurring expenses</div></div>
      </div>
      {/*summary stats and pie chart*/}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, marginBottom: 28 }}>
        {/*stat cards*/}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Total Credit Limit', value: fmt(totalLimit, true), color: '' },
            { label: 'Total Available', value: fmt(Math.max(totalAvail, 0), true), color: 'var(--green-600)' },
            { label: 'Total Owed', value: fmt(totalUsed, true), color: totalUsed > 0 ? 'var(--red-500)' : '' },
            totalCreditBalance > 0
              ? { label: 'Total Credit Balance', value: fmt(totalCreditBalance, true), color: 'var(--green-600)' }
              : { label: 'Accrued Interest', value: fmt(totalInterest, true), color: totalInterest > 0 ? 'var(--amber-500)' : '' },
            { label: '% Limit Used', value: `${usedPct}%`, color: parseFloat(usedPct) > 80 ? 'var(--red-500)' : '' },
            { label: 'Projected 30-day Interest', value: fmt(projected30, true), color: 'var(--amber-500)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="statCard">
              <div className="statLabel">{label}</div>
              <div className="statValue" style={{ color: color || 'var(--gray-900)' }}>{value}</div>
            </div>
          ))}
        </div>
        {/*pie chart showing usage*/}
        <div className="chartContainer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cardTitle" style={{ marginBottom: 8 }}>Limit Usage</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sectionHeader">
        <div className="sectionTitle">Credit Accounts</div>
        <button className="btn btnPrimary btnSm" onClick={openAddCredit}><Plus size={14} /> Add Credit Account</button>
      </div>
      {creditAccounts.length === 0 ? (
        <div className="emptyState"><CreditCard size={40} /><h3>No credit accounts</h3><p>Add a credit card, line of credit, or loan</p>
          <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openAddCredit}><Plus size={16} /> Add Credit Account</button>
        </div>
      ) : (
        <DraggableList items={creditAccounts} onReorder={reorderCreditAccounts} keyExtractor={a => a.id}
          renderItem={(a, _, handle) => (
            <CreditCard2 account={a} onEdit={openEditCredit} onDelete={deleteCreditAccount} transactions={transactions} handle={handle} />
          )} />
      )}

      <div className="sectionHeader">
        <div className="sectionTitle">Expenses</div>
        <button className="btn btnPrimary btnSm" onClick={openAddExpense}><Plus size={14} /> Add Recurring Expense</button>
      </div>
      {expenseStreams.length === 0 ? (
        <div className="emptyState"><TrendingDown size={40} /><h3>No Recurring Expenses</h3>
          <p>Add recurring expenses like subscriptions, rent, utilities, etc.</p>
          <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openAddExpense}><Plus size={16} /> Add Recurring Expense</button>
        </div>
      ) : (
        <DraggableList items={expenseStreams} onReorder={reorderExpenseStreams} keyExtractor={s => s.id}
          renderItem={(s, _, handle) => (
            <ExpenseCard stream={s} accounts={accounts} creditAccounts={creditAccounts} onEdit={openEditExpense} onDelete={deleteExpenseStream} handle={handle} />
          )} />
      )}
      {/*credit account modal*/}  
      {showCreditModal && (
        <Modal title={editingCredit ? 'Edit Credit Account' : 'Add Credit Account'} onClose={() => setShowCreditModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowCreditModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={saveCredit}>{editingCredit ? 'Save' : 'Add'}</button></>}>
          
          {/*account name input*/}
          <FormGroup label="Account Name">
            <input className={creditErrors.name ? 'inputError' : ''} value={creditForm.name} onChange={e => cf('name', e.target.value)} placeholder="e.g. Visa, Line of Credit" />
            {creditErrors.name && <span className="errorText">{creditErrors.name}</span>}
          </FormGroup>
          <div className="formRow">
            {/*credit limit input*/}
            <FormGroup label="Credit Limit ($)">
              <input className={creditErrors.limit ? 'inputError' : ''} type="number" value={creditForm.limit} onChange={e => cf('limit', e.target.value)} placeholder="5000" />
              {creditErrors.limit && <span className="errorText">{creditErrors.limit}</span>}
            </FormGroup>
            {/*interest rate input*/}
            <FormGroup label="Interest Rate (%)">
              <input className={creditErrors.interestRate ? 'inputError' : ''} type="number" value={creditForm.interestRate} onChange={e => cf('interestRate', e.target.value)} placeholder="19.99" step="0.01" />
              {creditErrors.interestRate && <span className="errorText">{creditErrors.interestRate}</span>}
            </FormGroup>
          </div>
          <div className="formRow">
            {/*compounding interest input*/}
            <FormGroup label="Compounding Frequency">
              <select value={creditForm.compounding} onChange={e => cf('compounding', e.target.value)}>
                <option value="daily">Daily</option><option value="monthly">Monthly</option><option value="annually">Annually</option>
              </select>
            </FormGroup>
            {/*grace period input*/}
            <FormGroup label="Grace Period (days)">
              <input type="number" value={creditForm.gracePeriod} onChange={e => cf('gracePeriod', e.target.value)} placeholder="0" />
            </FormGroup>
          </div>
          <div className="formRow">
            {/*Previous history inputs*/}
            <FormGroup label="Current Balance Owed ($)" hint="How much you currently owe">
              <input type="number" value={creditForm.balance} onChange={e => cf('balance', e.target.value)} placeholder="0" />
            </FormGroup>
            <FormGroup label="Accrued Interest ($)">
              <input type="number" value={creditForm.accruedInterest} onChange={e => cf('accruedInterest', e.target.value)} placeholder="0" />
            </FormGroup>
          </div>
            {/*minimum payment*/}
          <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-600)' }}>
            Min. payment = max(3% of balance, $10)  -  calculated automatically
          </div>
        </Modal>
      )}

      {/*recurring expense modal*/}
      {showExpenseModal && (
        <Modal title={editingExpense ? 'Edit Expense Stream' : 'Add Expense Stream'} onClose={() => setShowExpenseModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={saveExpense}>{editingExpense ? 'Save' : 'Add'}</button></>}>
          {/*expense name input*/}
          <FormGroup label="Expense Name">
            <input className={expenseErrors.name ? 'inputError' : ''} value={expenseForm.name} onChange={e => ef('name', e.target.value)} placeholder="e.g. Netflix, Rent, Hydro" />
            {expenseErrors.name && <span className="errorText">{expenseErrors.name}</span>}
          </FormGroup>
          <div className="formRow">
            {/*amount input*/}
            <FormGroup label="Amount ($)">
              <input className={expenseErrors.amount ? 'inputError' : ''} type="number" value={expenseForm.amount} onChange={e => ef('amount', e.target.value)} placeholder="0.00" />
              {expenseErrors.amount && <span className="errorText">{expenseErrors.amount}</span>}
            </FormGroup>
            {/*frequency input*/}
            <FormGroup label="Frequency">
              <select value={expenseForm.frequency} onChange={e => ef('frequency', e.target.value)}>
                {Object.entries(FREQ_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                <option value="custom">Custom</option>
              </select>
            </FormGroup>
          </div>
          {expenseForm.frequency === 'custom' && (
            <div className="formRow">
              <FormGroup label="Every"><input type="number" min={1} value={expenseForm.customEvery} onChange={e => ef('customEvery', e.target.value)} /></FormGroup>
              <FormGroup label="Unit">
                <select value={expenseForm.customUnit} onChange={e => ef('customUnit', e.target.value)}>
                  <option value="days">Days</option><option value="weeks">Weeks</option>
                  <option value="months">Months</option><option value="years">Years</option>
                </select>
              </FormGroup>
            </div>
          )}
          {/*account and budget category selection*/}
          <div className="formRow">
            <FormGroup label="Charge to Account">
              <select value={expenseForm.accountId} onChange={e => {
                const acct = allAccounts.find(a => a.id === e.target.value)
                ef('accountId', e.target.value); ef('accountType', acct?.type || 'regular')
              }}>
                <option value=""> -  Select account  - </option>
                <optgroup label="Regular Accounts">{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
                <optgroup label="Credit Accounts">{creditAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
              </select>
            </FormGroup>
            <FormGroup label="Budget Category (optional)">
              <select value={expenseForm.budgetCategory} onChange={e => ef('budgetCategory', e.target.value)}>
                <option value=""> -  None  - </option>
                {budgetCategories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FormGroup>
          </div>
          {/*optional start date*/}
          <FormGroup label="Start Date (optional)">
            <input type="date" value={expenseForm.startDate} onChange={e => ef('startDate', e.target.value)} />
          </FormGroup>
        </Modal>
      )}
    </div>
  )
}
