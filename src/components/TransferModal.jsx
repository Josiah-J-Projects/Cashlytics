import React, { useState } from 'react'
import { useStore, fmt, todayStr, FREQ_LABELS } from '../store/index.js'
import { Modal, FormGroup } from './Modal.jsx'

//check form inputs before saving
function validate(form) {
  const errs = {}
  if (!form.name?.trim()) errs.name = 'Name is required'
  if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
    errs.amount = 'A positive amount is required'
  if (!form.fromId) errs.fromId = 'Source account is required'
  if (!form.toId) errs.toId = 'Destination account is required'
  if (form.fromId && form.fromId === form.toId) errs.toId = 'Source and destination must differ'
  return errs
}

export default function TransferModal({ mode = 'once', defaultDate, onClose }) {
  // get state and actions from store
  const { accounts, creditAccounts, budgetCategories,
    executeTransfer, addAccountTransfer } = useStore()

  const [form, setForm] = useState({
    name: mode === 'recurring' ? '' : 'Account Transfer',
    amount: '',
    fromId: '',
    fromType: 'regular',
    toId: '',
    toType: 'regular',
    budgetCategory: '',
    date: defaultDate || todayStr(),
    // recurring-only
    frequency: 'monthly',
    startDate: '',
    customEvery: 1,
    customUnit: 'months',
  })
  const [errors, setErrors] = useState({})

   //combine regular and credit accounts into a single list
  const allAccounts = [
    ...accounts.map(a => ({ id: a.id, name: a.name, type: 'regular' })),
    ...creditAccounts.map(a => ({ id: a.id, name: a.name, type: 'credit' })),
  ]

  const ff = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const setAccount = (side, id) => {
    const acct = allAccounts.find(a => a.id === id)
    ff(side === 'from' ? 'fromId' : 'toId', id)
    ff(side === 'from' ? 'fromType' : 'toType', acct?.type || 'regular')
  }
  
  const handleSave = () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (mode === 'recurring') {
      addAccountTransfer(form)
    } else {
      executeTransfer(form)
    }
    onClose()
  }

  const fromAcct = allAccounts.find(a => a.id === form.fromId)
  const toAcct   = allAccounts.find(a => a.id === form.toId)

  return (
    <Modal
      title={mode === 'recurring' ? 'Add Automatic Transfer' : 'Transfer Money'}
      onClose={onClose}
      footer={<>
        <button className="btn btnSecondary" onClick={onClose}>Cancel</button>
        <button className="btn btnPrimary" onClick={handleSave}>
          {mode === 'recurring' ? 'Add Automatic Transfer' : 'Transfer'}
        </button>
      </>}
    >{/* name field */}
      <FormGroup label="Transfer Name">
        <input
          className={errors.name ? 'inputError' : ''}
          value={form.name}
          onChange={e => ff('name', e.target.value)}
          placeholder="e.g. Monthly savings"
          autoFocus
        />
        {errors.name && <span className="errorText">{errors.name}</span>}
      </FormGroup>

      {/* from field */}
      <div className="formRow">
        <FormGroup label="From Account">
          <select
            className={errors.fromId ? 'inputError' : ''}
            value={form.fromId}
            onChange={e => setAccount('from', e.target.value)}
          >
            <option value="">- Select account -</option>
            {accounts.length > 0 && (
              <optgroup label="Regular Accounts">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </optgroup>
            )}
            {creditAccounts.length > 0 && (
              <optgroup label="Credit Accounts">
                {creditAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </optgroup>
            )}
          </select>
          {errors.fromId && <span className="errorText">{errors.fromId}</span>}
        </FormGroup>

        {/* to field */}
        <FormGroup label="To Account">
          <select
            className={errors.toId ? 'inputError' : ''}
            value={form.toId}
            onChange={e => setAccount('to', e.target.value)}
          >
            <option value="">- Select account -</option>
            {accounts.length > 0 && (
              <optgroup label="Regular Accounts">
                {accounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === form.fromId}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {creditAccounts.length > 0 && (
              <optgroup label="Credit Accounts">
                {creditAccounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === form.fromId}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {errors.toId && <span className="errorText">{errors.toId}</span>}
        </FormGroup>
      </div>

      {/* amount and frequency fields */}
      <div className="formRow">
        <FormGroup label="Amount ($)">
          <input
            className={errors.amount ? 'inputError' : ''}
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => ff('amount', e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && <span className="errorText">{errors.amount}</span>}
        </FormGroup>

        {mode === 'once' ? (
          <FormGroup label="Date">
            <input type="date" value={form.date} onChange={e => ff('date', e.target.value)} />
          </FormGroup>
        ) : (
          <FormGroup label="Frequency">
            <select value={form.frequency} onChange={e => ff('frequency', e.target.value)}>
              {Object.entries(FREQ_LABELS).filter(([k]) => k !== 'once').map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </FormGroup>
        )}
      </div>

      {mode === 'recurring' && form.frequency === 'custom' && (
        <div className="formRow">
          <FormGroup label="Every">
            <input type="number" min={1} value={form.customEvery}
              onChange={e => ff('customEvery', e.target.value)} />
          </FormGroup>
          <FormGroup label="Unit">
            <select value={form.customUnit} onChange={e => ff('customUnit', e.target.value)}>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </FormGroup>
        </div>
      )}
      {/* optional fields */}
      {mode === 'recurring' && (
        <FormGroup label="Start Date (optional)">
          <input type="date" value={form.startDate} onChange={e => ff('startDate', e.target.value)} />
        </FormGroup>
      )}

      <FormGroup label="Budget Category (optional)">
        <select value={form.budgetCategory} onChange={e => ff('budgetCategory', e.target.value)}>
          <option value="">- None -</option>
          {budgetCategories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </FormGroup>

      {/* Preview */}
      {form.fromId && form.toId && form.amount && parseFloat(form.amount) > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginTop: 4,
          background: 'var(--green-50)', color: 'var(--green-700)',
          fontSize: 13, fontWeight: 500
        }}>
          {fromAcct?.name} - {fmt(parseFloat(form.amount))} - {toAcct?.name}
          {fromAcct?.type === 'credit' && ' (cash advance)'}
          {toAcct?.type === 'credit' && ' (payment)'}
        </div>
      )}
    </Modal>
  )
}
