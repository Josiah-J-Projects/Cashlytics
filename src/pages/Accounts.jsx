import React, { useState } from 'react'
import { useStore, fmt, FREQ_LABELS, ACCOUNT_CATEGORIES } from '../store/index.js'
import { Modal, FormGroup } from '../components/Modal.jsx'
import { DraggableList } from '../components/DraggableList.jsx'
import { Wallet, Plus, ChevronDown, ChevronUp, Edit2, Trash2, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { monthlyAmount } from '../store/index.js'

function validate(form, type) {
  const errs = {}
  if (!form.name?.trim()) errs.name = 'Name is required'
  if (type === 'account' && (form.balance === '' || isNaN(parseFloat(form.balance ?? '')))) errs.balance = 'Balance is required'
  if (type === 'income') {
    if (!form.amount || isNaN(parseFloat(form.amount))) errs.amount = 'Amount is required'
    if (!form.frequency) errs.frequency = 'Frequency is required'
  }
  return errs
}

function AccountCard({ account, onEdit, onDelete, transactions, handle }) {
  const [expanded, setExpanded] = useState(false)
  const acctTxs = transactions.filter(t => t.accountId === account.id).sort((a,b) => new Date(b.date)-new Date(a.date))
  return (
    <div className="itemCard">
      <div className="itemCardHeader" onClick={() => setExpanded(!expanded)}>
        {handle}
        <div className="itemCardIcon"><Wallet size={18} /></div>
        <div className="itemCardInfo">
          <div className="itemCardName">{account.name}<span className="badge badgeGreen">{account.category}</span></div>
          <div className="itemCardMeta">{acctTxs.length} transaction{acctTxs.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="itemCardValue">
          <div className="itemCardAmount positive">{fmt(account.balance)}</div>
        </div>
        <div className="itemCardActions" onClick={e => e.stopPropagation()}>
          <button className="btn btnGhost btnIcon" onClick={() => onEdit(account)}><Edit2 size={15} /></button>
          <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => onDelete(account.id)}><Trash2 size={15} /></button>
        </div>
        {expanded ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
      </div>
      {expanded && (
        <div className="itemCardDropdown">
          {acctTxs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: '8px 0' }}>No transactions yet</div>
          ) : acctTxs.map(tx => (
            <div key={tx.id} className="txRow" style={{ padding: '8px 0' }}>
              <div className="txIcon" style={{ width: 30, height: 30, background: tx.amount >= 0 ? 'var(--green-50)' : 'var(--red-100)', borderRadius: 8 }}>
                {tx.amount >= 0 ? <ArrowUpRight size={14} color="var(--green-600)" /> : <ArrowDownRight size={14} color="var(--red-500)" />}
              </div>
              <div className="txInfo">
                <div className="txName" style={{ fontSize: 13 }}>{tx.name}</div>
                <div className="txMeta">{tx.date}{tx.budgetCategory ? ` · ${tx.budgetCategory}` : ''}</div>
              </div>
              <div className="txAmount" style={{ fontSize: 13, color: tx.amount >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IncomeCard({ stream, accounts, onEdit, onDelete, handle }) {
  const account = accounts.find(a => a.id === stream.accountId)
  const orphaned = stream.accountId && !account
  return (
    <div className="itemCard">
      <div className="itemCardHeader">
        {handle}
        <div className="itemCardIcon" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}><TrendingUp size={18} /></div>
        <div className="itemCardInfo">
          <div className="itemCardName">
            {stream.name}
            {orphaned && <AlertCircle size={14} className="alertIcon" title="Target account deleted!" />}
          </div>
          <div className="itemCardMeta">
            {FREQ_LABELS[stream.frequency] || stream.frequency}
            {account ? ` · → ${account.name}` : orphaned ? ' · No account!' : ''}
            {stream.startDate ? ` · From ${stream.startDate}` : ''}
          </div>
        </div>
        <div className="itemCardValue"><div className="itemCardAmount positive">{fmt(stream.amount)}</div></div>
        <div className="itemCardActions">
          <button className="btn btnGhost btnIcon" onClick={() => onEdit(stream)}><Edit2 size={15} /></button>
          <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => onDelete(stream.id)}><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  )
}

const EMPTY_A = { name: '', category: 'Cash', balance: '', note: '' }
const EMPTY_I = { name: '', amount: '', frequency: 'monthly', accountId: '', startDate: '', customEvery: 1, customUnit: 'months' }

export default function Accounts() {
  const { accounts, incomeStreams, transactions,
    addAccount, updateAccount, deleteAccount,
    addIncomeStream, updateIncomeStream, deleteIncomeStream,
    reorderAccounts, reorderIncomeStreams } = useStore()

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [accountForm, setAccountForm] = useState(EMPTY_A)
  const [incomeForm, setIncomeForm] = useState(EMPTY_I)
  const [accountErrors, setAccountErrors] = useState({})
  const [incomeErrors, setIncomeErrors] = useState({})

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const hardAssets = accounts.filter(a => ['Assets','Investment'].includes(a.category)).reduce((s,a) => s+(a.balance||0),0)
  const cashAccounts = accounts.filter(a => ['Cash','Savings'].includes(a.category)).reduce((s,a) => s+(a.balance||0),0)
  const emergency = accounts.filter(a => a.category === 'Emergency').reduce((s,a) => s+(a.balance||0),0)
  const totalIncome = incomeStreams.reduce((s, i) => s + monthlyAmount(i), 0)

  const openAddAccount = () => { setEditingAccount(null); setAccountForm(EMPTY_A); setAccountErrors({}); setShowAccountModal(true) }
  const openEditAccount = (a) => { setEditingAccount(a); setAccountForm(a); setAccountErrors({}); setShowAccountModal(true) }
  const saveAccount = () => {
    const errs = validate(accountForm, 'account')
    if (Object.keys(errs).length) { setAccountErrors(errs); return }
    if (editingAccount) updateAccount(editingAccount.id, accountForm)
    else addAccount(accountForm)
    setShowAccountModal(false)
  }

  const openAddIncome = () => { setEditingIncome(null); setIncomeForm(EMPTY_I); setIncomeErrors({}); setShowIncomeModal(true) }
  const openEditIncome = (s) => { setEditingIncome(s); setIncomeForm(s); setIncomeErrors({}); setShowIncomeModal(true) }
  const saveIncome = () => {
    const errs = validate(incomeForm, 'income')
    if (Object.keys(errs).length) { setIncomeErrors(errs); return }
    if (editingIncome) updateIncomeStream(editingIncome.id, incomeForm)
    else addIncomeStream(incomeForm)
    setShowIncomeModal(false)
  }

  const af = (k, v) => { setAccountForm(f => ({ ...f, [k]: v })); setAccountErrors(e => ({ ...e, [k]: null })) }
  const inf = (k, v) => { setIncomeForm(f => ({ ...f, [k]: v })); setIncomeErrors(e => ({ ...e, [k]: null })) }

  return (
    <div className="page">
      <div className="pageHeader">
        <div><h1 className="pageTitle">Accounts</h1><div className="pageSubtitle">Manage your accounts and income streams</div></div>
      </div>

      <div className="statCards statCards3" style={{ marginBottom: 28 }}>
        <div className="statCard green"><div className="statLabel">Total Balance</div><div className="statValue">{fmt(totalBalance, true)}</div></div>
        <div className="statCard"><div className="statLabel">Est. Monthly Income</div><div className="statValue" style={{ color: 'var(--green-600)' }}>{fmt(totalIncome, true)}</div></div>
        <div className="statCard"><div className="statLabel">Emergency Funds</div><div className="statValue">{fmt(emergency, true)}</div></div>
        <div className="statCard"><div className="statLabel">Hard Assets</div><div className="statValue">{fmt(hardAssets, true)}</div></div>
        <div className="statCard"><div className="statLabel">Cash & Savings</div><div className="statValue">{fmt(cashAccounts, true)}</div></div>
        <div className="statCard"><div className="statLabel">Non-Emergency</div><div className="statValue">{fmt(totalBalance - emergency, true)}</div></div>
      </div>

      <div className="sectionHeader">
        <div className="sectionTitle">Accounts</div>
        <button className="btn btnPrimary btnSm" onClick={openAddAccount}><Plus size={14} /> Add Account</button>
      </div>
      {accounts.length === 0 ? (
        <div className="emptyState"><Wallet size={40} /><h3>No accounts yet</h3><p>Add your first account to get started</p>
          <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openAddAccount}><Plus size={16} /> Add Account</button>
        </div>
      ) : (
        <DraggableList items={accounts} onReorder={reorderAccounts} keyExtractor={a => a.id}
          renderItem={(a, _, handle) => (
            <AccountCard account={a} onEdit={openEditAccount} onDelete={deleteAccount} transactions={transactions} handle={handle} />
          )} />
      )}

      <div className="sectionHeader">
        <div className="sectionTitle">Income</div>
        <button className="btn btnPrimary btnSm" onClick={openAddIncome}><Plus size={14} /> Add Income Stream</button>
      </div>
      {incomeStreams.length === 0 ? (
        <div className="emptyState"><TrendingUp size={40} /><h3>No income streams</h3><p>Add recurring income like salary, rent, etc.</p>
          <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openAddIncome}><Plus size={16} /> Add Income Stream</button>
        </div>
      ) : (
        <DraggableList items={incomeStreams} onReorder={reorderIncomeStreams} keyExtractor={s => s.id}
          renderItem={(s, _, handle) => (
            <IncomeCard stream={s} accounts={accounts} onEdit={openEditIncome} onDelete={deleteIncomeStream} handle={handle} />
          )} />
      )}

      {showAccountModal && (
        <Modal title={editingAccount ? 'Edit Account' : 'Add Account'} onClose={() => setShowAccountModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowAccountModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={saveAccount}>{editingAccount ? 'Save Changes' : 'Add Account'}</button></>}>
          <FormGroup label="Account Name">
            <input className={accountErrors.name ? 'inputError' : ''} value={accountForm.name} onChange={e => af('name', e.target.value)} placeholder="e.g. TD Chequing" />
            {accountErrors.name && <span className="errorText">{accountErrors.name}</span>}
          </FormGroup>
          <div className="formRow">
            <FormGroup label="Category">
              <select value={accountForm.category} onChange={e => af('category', e.target.value)}>
                {ACCOUNT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Current Balance ($)">
              <input className={accountErrors.balance ? 'inputError' : ''} type="number" value={accountForm.balance} onChange={e => af('balance', e.target.value)} placeholder="0.00" />
              {accountErrors.balance && <span className="errorText">{accountErrors.balance}</span>}
            </FormGroup>
          </div>
          <FormGroup label="Note (optional)">
            <input value={accountForm.note || ''} onChange={e => af('note', e.target.value)} placeholder="Optional description" />
          </FormGroup>
        </Modal>
      )}

      {showIncomeModal && (
        <Modal title={editingIncome ? 'Edit Income Stream' : 'Add Income Stream'} onClose={() => setShowIncomeModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowIncomeModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={saveIncome}>{editingIncome ? 'Save Changes' : 'Add Income Stream'}</button></>}>
          <FormGroup label="Name">
            <input className={incomeErrors.name ? 'inputError' : ''} value={incomeForm.name} onChange={e => inf('name', e.target.value)} placeholder="e.g. Salary, Freelance" />
            {incomeErrors.name && <span className="errorText">{incomeErrors.name}</span>}
          </FormGroup>
          <div className="formRow">
            <FormGroup label="Amount ($)">
              <input className={incomeErrors.amount ? 'inputError' : ''} type="number" value={incomeForm.amount} onChange={e => inf('amount', e.target.value)} placeholder="0.00" />
              {incomeErrors.amount && <span className="errorText">{incomeErrors.amount}</span>}
            </FormGroup>
            <FormGroup label="Frequency">
              <select value={incomeForm.frequency} onChange={e => inf('frequency', e.target.value)}>
                {Object.entries(FREQ_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                <option value="custom">Custom</option>
              </select>
            </FormGroup>
          </div>
          {incomeForm.frequency === 'custom' && (
            <div className="formRow">
              <FormGroup label="Every"><input type="number" min={1} value={incomeForm.customEvery} onChange={e => inf('customEvery', e.target.value)} /></FormGroup>
              <FormGroup label="Unit">
                <select value={incomeForm.customUnit} onChange={e => inf('customUnit', e.target.value)}>
                  <option value="days">Days</option><option value="weeks">Weeks</option>
                  <option value="months">Months</option><option value="years">Years</option>
                </select>
              </FormGroup>
            </div>
          )}
          <div className="formRow">
            <FormGroup label="Deposit to Account">
              <select value={incomeForm.accountId} onChange={e => inf('accountId', e.target.value)}>
                <option value=""> -  Select account  - </option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Start Date (optional)">
              <input type="date" value={incomeForm.startDate} onChange={e => inf('startDate', e.target.value)} />
            </FormGroup>
          </div>
        </Modal>
      )}
    </div>
  )
}
