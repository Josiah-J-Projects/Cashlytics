import React, { useState, useEffect } from 'react'
import { useStore, todayStr, fmt } from '../store/index.js'
import { Modal, FormGroup } from './Modal.jsx'

function validate(form) {
  const errs = {}
  if (!form.name?.trim()) errs.name = 'Name is required'
  if (!form.amount || form.amount === '' || isNaN(parseFloat(form.amount))) errs.amount = 'Amount is required'
  if (!form.accountId) errs.accountId = 'Account is required'
  return errs
}

export default function TransactionModal({ defaultDate, onClose }) {
  //get data and actions from global store
  const { accounts, creditAccounts, budgetCategories, addTransaction } = useStore()
  //UI state
  const [txType, setTxType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '', accountId: '', budgetCategory: '',
    date: defaultDate || todayStr(), note: '',
  })

  //update date
  useEffect(() => {
    setForm(f => ({ ...f, date: defaultDate || todayStr() }))
  }, [defaultDate])

  //combine accounts
  const allAccounts = [
    ...accounts.map(a => ({ id: a.id, name: a.name, type: 'regular' })),
    ...creditAccounts.map(a => ({ id: a.id, name: a.name, type: 'credit' })),
  ]

  //convert amount to signed value
  const signedAmount = txType === 'income'
    ? Math.abs(parseFloat(amount) || 0)
    : -(Math.abs(parseFloat(amount) || 0))

    //handle save to add transaction
  const handleSave = () => {
    const fullForm = { ...form, amount: signedAmount }
    const errs = validate(fullForm)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const acct = allAccounts.find(a => a.id === form.accountId)
    addTransaction({ ...fullForm, accountType: acct?.type || 'regular' })
    onClose()
  }

  //helper to update form fields
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  return (
    <Modal title="Add Transaction" onClose={onClose}
      footer={<>
      {/*cancel button*/}
        <button className="btn btnSecondary" onClick={onClose}>Cancel</button>
        {/*save button*/}
        <button className="btn btnPrimary" onClick={handleSave}>Add Transaction</button>
      </>}>

      {/* income / expense toggle*/}
      <div className="txTypeToggle">
        <button className={`txTypeBtn${txType === 'income' ? ' activeIncome' : ''}`}
          onClick={() => setTxType('income')}>
          ↑ Income
        </button>
        <button className={`txTypeBtn${txType === 'expense' ? ' activeExpense' : ''}`}
          onClick={() => setTxType('expense')}>
          ↓ Expense
        </button>
      </div>

         {/*transaction name*/}
      <FormGroup label="Transaction Name">
        <input
          className={errors.name ? 'inputError' : ''}
          value={form.name}
          onChange={e => { f('name', e.target.value); setErrors(p => ({ ...p, name: null })) }}
          placeholder={txType === 'income' ? 'e.g. Salary, Freelance payment' : 'e.g. Groceries, Netflix'}
          autoFocus
        />
        {errors.name && <span className="errorText">{errors.name}</span>}
      </FormGroup>

      <div className="formRow">
        {/*amount input*/}
        <FormGroup label="Amount ($)">
          <div className="amountInputWrap">
            {/*sign indicator*/}
            <span className={`signBadge ${txType === 'income' ? 'signPositive' : 'signNegative'}`}>
              {txType === 'income' ? '+' : '−'}
            </span>
            <input
              className={`amountInputField${errors.amount ? ' inputError' : ''}`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: null })) }}
              placeholder="0.00"
            />
          </div>
          {errors.amount && <span className="errorText">{errors.amount}</span>}
        </FormGroup>
        {/*date input*/}  
        <FormGroup label="Date">
          <input type="date" value={form.date} onChange={e => f('date', e.target.value)} />
        </FormGroup>
      </div>

      <div className="formRow">
        <FormGroup label="Account">
          <select
            className={errors.accountId ? 'inputError' : ''}
            value={form.accountId}
            onChange={e => { f('accountId', e.target.value); setErrors(p => ({ ...p, accountId: null })) }}>
            <option value=""> - Select account - </option>
            {accounts.length > 0 && <optgroup label="Regular Accounts">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
            {creditAccounts.length > 0 && <optgroup label="Credit Accounts">{creditAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
          </select>
          {errors.accountId && <span className="errorText">{errors.accountId}</span>}
        </FormGroup>
        {/* budjet category select*/}
        <FormGroup label="Budget Category (optional)">
          <select value={form.budgetCategory} onChange={e => f('budgetCategory', e.target.value)}>
            <option value=""> - None - </option>
            {budgetCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </FormGroup>
      </div>

        {/*Add note*/}
      <FormGroup label="Note (optional)">
        <input value={form.note} onChange={e => f('note', e.target.value)} placeholder="Optional note" />
      </FormGroup>

        {/*preview of transaction*/}
      {amount && parseFloat(amount) > 0 && (
        <div className={`txPreview ${txType === 'income' ? 'previewIncome' : 'previewExpense'}`}>
          {txType === 'income' ? '↑ Adding' : '↓ Spending'} {fmt(Math.abs(parseFloat(amount) || 0))}
          {form.accountId && ` - ${allAccounts.find(a => a.id === form.accountId)?.name || ''}`}
        </div>
      )}
    </Modal>
  )
}
