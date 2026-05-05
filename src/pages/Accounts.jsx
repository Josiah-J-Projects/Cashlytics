import React, { useState } from 'react'
import { useStore, fmt, FREQ_LABELS, ACCOUNT_CATEGORIES } from '../store/index.js'
import { Modal, FormGroup } from '../components/Modal.jsx'
import { DraggableList } from '../components/DraggableList.jsx'
import { Wallet, Plus, ChevronDown, ChevronUp, Edit2, Trash2, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react'
import { monthlyAmount } from '../store/index.js'
import TransferModal from '../components/TransferModal.jsx'

//check form fields
function validate(form, type) {
  const errs = {}
  //check name
  if (!form.name?.trim()) errs.name = 'Name is required'
  if (type === 'account' && form.balance !== '' && isNaN(parseFloat(form.balance))) { errs.balance = 'Balance must be a number'}
  if (type === 'income') {
    if (!form.amount || isNaN(parseFloat(form.amount))) errs.amount = 'Amount is required'
    if (!form.frequency) errs.frequency = 'Frequency is required'
  }
  return errs
}
//account card
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
      {/*expanded transaction list*/}
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
//income stream card
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
            {account ? ` - ${account.name}` : orphaned ? ' · No account!' : ''}
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
//default empty forms
const EMPTY_A = { name: '', category: 'Cash', balance: '', note: '' }
const EMPTY_I = { name: '', amount: '', frequency: 'monthly', accountId: '', startDate: '', customEvery: 1, customUnit: 'months' }

function RecurringTransferEditModal({ existing, accounts, creditAccounts, budgetCategories, onSave, onClose }) {
  const allAccounts = [
    ...accounts.map(a => ({ id: a.id, name: a.name, type: 'regular' })),
    ...creditAccounts.map(a => ({ id: a.id, name: a.name, type: 'credit' })),
  ]
  //combine regular and credit accounts into a single list
  const [form, setForm] = useState(existing || {
    name: '', amount: '', fromId: '', fromType: 'regular',
    toId: '', toType: 'regular', frequency: 'monthly',
    startDate: '', budgetCategory: '', customEvery: 1, customUnit: 'months',
  })
  //If editing then preload with existing data
  //If creating new then use default values
  const [errors, setErrors] = useState({})
  const ff = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }
  const setAcct = (side, id) => {
    const acct = allAccounts.find(a => a.id === id)
    ff(side === 'from' ? 'fromId' : 'toId', id)
    ff(side === 'from' ? 'fromType' : 'toType', acct?.type || 'regular')
  }
  //checks if all values are valid when you submit 
  const handleSave = () => {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Name is required'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Amount is required'
    if (!form.fromId) errs.fromId = 'Source is required'
    if (!form.toId)   errs.toId   = 'Destination is required'
    if (form.fromId && form.fromId === form.toId) errs.toId = 'Must differ from source'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ ...form, amount: parseFloat(form.amount) })
  }
  return (
    <Modal title={existing ? 'Edit Automatic Transfer' : 'Add Automatic Transfer'} onClose={onClose}
      footer={<><button className="btn btnSecondary" onClick={onClose}>Cancel</button>
        <button className="btn btnPrimary" onClick={handleSave}>{existing ? 'Save' : 'Add'}</button></>}>
      {/* name field */}
      <FormGroup label="Name">
        <input className={errors.name ? 'inputError' : ''} value={form.name}
          onChange={e => ff('name', e.target.value)} placeholder="e.g. Monthly savings" autoFocus />
        {errors.name && <span className="errorText">{errors.name}</span>}
      </FormGroup>
      <div className="formRow">
        {/* from field */}
        <FormGroup label="From Account">
          <select className={errors.fromId ? 'inputError' : ''} value={form.fromId} onChange={e => setAcct('from', e.target.value)}>
            <option value="">- Select -</option>
            {accounts.length > 0 && <optgroup label="Regular">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
            {creditAccounts.length > 0 && <optgroup label="Credit">{creditAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
          </select>
          {errors.fromId && <span className="errorText">{errors.fromId}</span>}
        </FormGroup>
        {/* to field */}
        <FormGroup label="To Account">
          <select className={errors.toId ? 'inputError' : ''} value={form.toId} onChange={e => setAcct('to', e.target.value)}>
            <option value="">- Select -</option>
            {accounts.length > 0 && <optgroup label="Regular">{accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === form.fromId}>{a.name}</option>)}</optgroup>}
            {creditAccounts.length > 0 && <optgroup label="Credit">{creditAccounts.map(a => <option key={a.id} value={a.id} disabled={a.id === form.fromId}>{a.name}</option>)}</optgroup>}
          </select>
          {errors.toId && <span className="errorText">{errors.toId}</span>}
        </FormGroup>
      </div>
      <div className="formRow">
        <FormGroup label="Amount ($)">
          <input className={errors.amount ? 'inputError' : ''} type="number" min="0" step="0.01"
            value={form.amount} onChange={e => ff('amount', e.target.value)} placeholder="0.00" />
          {errors.amount && <span className="errorText">{errors.amount}</span>}
        </FormGroup>
        {/* frequency field */}
        <FormGroup label="Frequency">
          <select value={form.frequency} onChange={e => ff('frequency', e.target.value)}>
            {Object.entries(FREQ_LABELS).filter(([k]) => k !== 'once').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="custom">Custom</option>
          </select>
        </FormGroup>
      </div>
      {form.frequency === 'custom' && (
        <div className="formRow">
          <FormGroup label="Every"><input type="number" min={1} value={form.customEvery} onChange={e => ff('customEvery', e.target.value)} /></FormGroup>
          <FormGroup label="Unit">
            <select value={form.customUnit} onChange={e => ff('customUnit', e.target.value)}>
              <option value="days">Days</option><option value="weeks">Weeks</option>
              <option value="months">Months</option><option value="years">Years</option>
            </select>
          </FormGroup>
        </div>
      )}
      {/* optional fields */}
      <div className="formRow">
        <FormGroup label="Start Date (optional)">
          <input type="date" value={form.startDate} onChange={e => ff('startDate', e.target.value)} />
        </FormGroup>
        <FormGroup label="Budget Category (optional)">
          <select value={form.budgetCategory} onChange={e => ff('budgetCategory', e.target.value)}>
            <option value="">- None -</option>
            {budgetCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </FormGroup>
      </div>
    </Modal>
  )
}

export default function Accounts() {
  const { accounts, incomeStreams, transactions, creditAccounts, budgetCategories,
    addAccount, updateAccount, deleteAccount,
    addIncomeStream, updateIncomeStream, deleteIncomeStream,
    reorderAccounts, reorderIncomeStreams, accountTransfers, 
    addAccountTransfer, updateAccountTransfer,
    deleteAccountTransfer, reorderAccountTransfers } = useStore()

  //modal
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [accountForm, setAccountForm] = useState(EMPTY_A)
  const [incomeForm, setIncomeForm] = useState(EMPTY_I)
  const [accountErrors, setAccountErrors] = useState({})
  const [incomeErrors, setIncomeErrors] = useState({})
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showRecurringTransferModal, setShowRecurringTransferModal] = useState(false)
  const [editingRecurringTransfer, setEditingRecurringTransfer] = useState(null)

  //totals
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const hardAssets = accounts.filter(a => ['Assets','Investment'].includes(a.category)).reduce((s,a) => s+(a.balance||0),0)
  const cashAccounts = accounts.filter(a => ['Cash','Savings'].includes(a.category)).reduce((s,a) => s+(a.balance||0),0)
  const emergency = accounts.filter(a => a.category === 'Emergency').reduce((s,a) => s+(a.balance||0),0)
  const totalIncome = incomeStreams.reduce((s, i) => s + monthlyAmount(i), 0)

   //open account modal
  const openAddAccount = () => { setEditingAccount(null); setAccountForm(EMPTY_A); setAccountErrors({}); setShowAccountModal(true) }
  const openEditAccount = (a) => { setEditingAccount(a); setAccountForm(a); setAccountErrors({}); setShowAccountModal(true) }
  const saveAccount = () => {
    const errs = validate(accountForm, 'account')
    if (Object.keys(errs).length) { setAccountErrors(errs); return }
    if (editingAccount) updateAccount(editingAccount.id, accountForm)
    else addAccount(accountForm)
    setShowAccountModal(false)
  }

  //open income modal
  const openAddIncome = () => { setEditingIncome(null); setIncomeForm(EMPTY_I); setIncomeErrors({}); setShowIncomeModal(true) }
  const openEditIncome = (s) => { setEditingIncome(s); setIncomeForm(s); setIncomeErrors({}); setShowIncomeModal(true) }
  const saveIncome = () => {
    const errs = validate(incomeForm, 'income')
    if (Object.keys(errs).length) { setIncomeErrors(errs); return }
    if (editingIncome) updateIncomeStream(editingIncome.id, incomeForm)
    else addIncomeStream(incomeForm)
    setShowIncomeModal(false)
  }

  //update form helpers
  const af = (k, v) => (setAccountForm(f => ({ ...f, [k]: k === 'balance' ? (v === '' ? 0 : parseFloat(v)) : v })), setAccountErrors(e => ({ ...e, [k]: null })));
  const inf = (k, v) => { setIncomeForm(f => ({ ...f, [k]: v })); setIncomeErrors(e => ({ ...e, [k]: null })) }

  return (
    <div className="page">
      {/*header*/}
      <div className="pageHeader">
        <div><h1 className="pageTitle">Accounts</h1><div className="pageSubtitle">Manage your accounts and income streams</div></div>
        <button className="btn btnPrimary btnSm" onClick={() => setShowTransferModal(true)}>
                  <ArrowRightLeft size={14} /> Transfer Money
                </button>
      </div>

      {/*stats*/}
      <div className="statCards statCards3" style={{ marginBottom: 28 }}>
        <div className="statCard green"><div className="statLabel">Total Balance</div><div className="statValue">{fmt(totalBalance, true)}</div></div>
        <div className="statCard"><div className="statLabel">Est. Monthly Income</div><div className="statValue" style={{ color: 'var(--green-600)' }}>{fmt(totalIncome, true)}</div></div>
        <div className="statCard"><div className="statLabel">Emergency Funds</div><div className="statValue">{fmt(emergency, true)}</div></div>
        <div className="statCard"><div className="statLabel">Cash Assets</div><div className="statValue">{fmt(cashAccounts, true)}</div></div>
        <div className="statCard"><div className="statLabel">Hard Assets</div><div className="statValue">{fmt(hardAssets, true)}</div></div>
        <div className="statCard"><div className="statLabel">Non-Emergency</div><div className="statValue">{fmt(totalBalance - emergency, true)}</div></div>
      </div>

      
      {/*accounts section*/}
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

      {/* Income section*/}
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

      {/* automatic transfer section*/}
      <div className="sectionHeader">
        <div className="sectionTitle">Automatic Transfers</div>
        <button className="btn btnPrimary btnSm" onClick={() => { setEditingRecurringTransfer(null); setShowRecurringTransferModal(true) }}>
          <Plus size={14} /> Add Automatic Transfer
        </button>
      </div>
      {accountTransfers.length === 0 ? (
        <div className="emptyState">
          <ArrowRightLeft size={40} />
          <h3>No automatic transfers</h3>
          <p>Schedule automatic transfers between accounts, e.g. emergency fund contributions</p>
        </div>
      ) : (
        <DraggableList items={accountTransfers} onReorder={reorderAccountTransfers} keyExtractor={t => t.id}
          renderItem={(t, _, handle) => {
            const fromAcct = [...accounts, ...creditAccounts].find(a => a.id === t.fromId)
            const toAcct   = [...accounts, ...creditAccounts].find(a => a.id === t.toId)
            return (
              <div className="itemCard">
                <div className="itemCardHeader">
                  {handle}
                  <div className="itemCardIcon" style={{ background: 'var(--blue-100)', color: 'var(--blue-500)' }}>
                    <ArrowRightLeft size={18} />
                  </div>
                  <div className="itemCardInfo">
                    <div className="itemCardName">{t.name}</div>
                    <div className="itemCardMeta">
                      {FREQ_LABELS[t.frequency] || t.frequency}
                      {fromAcct ? ` - from ${fromAcct.name}` : ''}
                      {toAcct   ? ` - to ${toAcct.name}` : ''}
                      {t.budgetCategory ? ` - ${t.budgetCategory}` : ''}
                    </div>
                  </div>
                  <div className="itemCardValue">
                    <div className="itemCardAmount" style={{ color: 'var(--blue-500)' }}>{fmt(t.amount)}</div>
                  </div>
                  <div className="itemCardActions">
                    <button className="btn btnGhost btnIcon" onClick={() => { setEditingRecurringTransfer(t); setShowRecurringTransferModal(true) }}><Edit2 size={15} /></button>
                    <button className="btn btnGhost btnIcon" style={{ color: 'var(--red-500)' }} onClick={() => deleteAccountTransfer(t.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            )
          }} />
      )}

      {/*account modal*/}
      {showAccountModal && (
        <Modal title={editingAccount ? 'Edit Account' : 'Add Account'} onClose={() => setShowAccountModal(false)}
          footer={<><button className="btn btnSecondary" onClick={() => setShowAccountModal(false)}>Cancel</button>
            <button className="btn btnPrimary" onClick={saveAccount}>{editingAccount ? 'Save Changes' : 'Add Account'}</button></>}>
          <FormGroup label="Account Name">
            <input className={accountErrors.name ? 'inputError' : ''} value={accountForm.name} onChange={e => af('name', e.target.value)} placeholder="e.g. Chequing Account" />
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
      {/* single transfer modal */}
      {showTransferModal && (
        <TransferModal mode="once" onClose={() => setShowTransferModal(false)} />
      )}

      {/* Recurring transfer modal */}
      {showRecurringTransferModal && (
        <RecurringTransferEditModal
          existing={editingRecurringTransfer}
          accounts={accounts}
          creditAccounts={creditAccounts}
          budgetCategories={budgetCategories}
          onSave={(data) => {
            if (editingRecurringTransfer) updateAccountTransfer(editingRecurringTransfer.id, data)
            else addAccountTransfer(data)
            setShowRecurringTransferModal(false)
          }}
          onClose={() => setShowRecurringTransferModal(false)}
        />
      )}
      {/*income modal*/}
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
