import React, { useState, useRef } from 'react'
import { useStore, getOccurrencesBetween, fmt } from '../store/index.js'
import { Modal, FormGroup } from './Modal.jsx'
import { encryptData, decryptData, isEncrypted } from '../utils/encryption.js'
import { Download, Upload, CheckSquare, Square, Lock, Unlock, Eye, EyeOff } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

//password modal used for both save (encrypt) and load (decrypt)
function PasswordModal({ mode, onConfirm, onSkip, onCancel }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')

  //confirm button
  const handleConfirm = () => {
    //if encrypting, ensure passwords match
    if (mode === 'encrypt' && pw !== confirm) { setErr('passwords do not match.'); return }
    //ensure password is not empty
    if (!pw) { setErr('password cannot be empty.'); return }
    onConfirm(pw)
  }

  return (
    <Modal
    //dynamic title depending on mode
      title={mode === 'encrypt' ? 'Encrypt Save File' : 'Decrypt Save File'}
      onClose={onCancel}
      //footer buttons
      footer={<>
        <button className="btn btnSecondary" onClick={onCancel}>Cancel</button>
        {mode === 'encrypt' && (
          <button className="btn btnSecondary" onClick={onSkip}>Save Without Password</button>
        )}
        <button className="btn btnPrimary" onClick={handleConfirm}>
          <Lock size={14} /> {mode === 'encrypt' ? 'Save' : 'Load'}
        </button>
      </>}
    >
      {/*description text*/}
      {mode === 'encrypt' ? (
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
          Your data will be encrypted before saving. You will need this password to load the file later. There is no recovery option if the password is lost.
        </p>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
          This file is encrypted. Enter the password you used when saving.
        </p>
      )}
      {/*password input*/}
      <FormGroup label="Password">
        <div style={{ position: 'relative' }}>
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => { setPw(e.target.value); setErr('') }}
            placeholder="Enter password"
            autoFocus
            style={{ paddingRight: 40 }}
          />
          <button className="btn btnGhost btnIcon" onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </FormGroup>
      {/*confirm password (only for encryption)*/}
      {mode === 'encrypt' && (
        <FormGroup label="Confirm Password">
          <input type={show ? 'text' : 'password'} value={confirm}
            onChange={e => { setConfirm(e.target.value); setErr('') }} placeholder="Confirm password" />
        </FormGroup>
      )}
      {err && <span className="errorText">{err}</span>}
    </Modal>
  )
}

//main save/load component
export default function SaveLoad() {
  const store = useStore()
  const fileRef = useRef()
  const [showSavePw, setShowSavePw] = useState(false)
  const [loadRaw, setLoadRaw] = useState(null)  
  const [showLoadPw, setShowLoadPw] = useState(false)  
  const [catchUpModal, setCatchUpModal] = useState(null)
  const [selected, setSelected] = useState({})

  //Save 
  const handleSave = () => setShowSavePw(true)
  const doSave = async (password) => {
    //export as json string
    const json = store.exportState()
    let content, ext
    if (password) {
    //encrypt content
      content = await encryptData(json, password)
      ext = 'cly'
    } else {
    //save plain json
      content = json
      ext = 'json'
    }
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cashlytics-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    setShowSavePw(false)
  }

  //Load
  const handleLoadFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target.result
      setLoadRaw(raw)
      //check if file is encrypted
      if (isEncrypted(raw)) {
        setShowLoadPw(true)
      } else {
        processLoadedJson(raw)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  //handle decryption
  const handleDecrypt = async (password) => {
    try {
      const json = await decryptData(loadRaw, password)
      setShowLoadPw(false)
      processLoadedJson(json)
    } catch (err) {
      alert(err.message)
    }
  }
  //process json data
  const processLoadedJson = (jsonString) => {
    let parsed
    try { parsed = JSON.parse(jsonString) }
    catch { alert('Invalid file format.'); return }

    //determine time difference since last save
    const savedAt = parsed.savedAt ? parseISO(parsed.savedAt) : null
    const now = new Date()
    const daysDiff = savedAt ? differenceInDays(now, savedAt) : 0
    //check if month changed
    const monthCrossed = savedAt
      ? savedAt.getMonth() !== now.getMonth() || savedAt.getFullYear() !== now.getFullYear()
      : false

    //if no time passed, just import directly
    if (!savedAt || daysDiff <= 0) { store.importState(parsed); return }

    const allAccounts = [
      ...(parsed.accounts || []).map(a => ({ id: a.id, name: a.name, type: 'regular' })),
      ...(parsed.creditAccounts || []).map(a => ({ id: a.id, name: a.name, type: 'credit' })),
    ]

    //generate catch up income transactions
    const incomeTxs = []
    ;(parsed.incomeStreams || []).forEach(stream => {
      if (stream.frequency === 'once') return
      getOccurrencesBetween(stream, savedAt, now).forEach(date => {
        incomeTxs.push({
          name: stream.name + ' (auto)',
          amount: stream.amount,
          accountId: stream.accountId,
          accountType: 'regular',
          date: format(date, 'yyyy-MM-dd'),
          budgetCategory: '',
          note: 'Catch up from load',
          createdAt: new Date().toISOString(),
          label: `${stream.name} - ${fmt(stream.amount)} on ${format(date, 'MMM d')}`,
        })
      })
    })

    //generate catch up expense transactions
    const expenseTxs = []
    ;(parsed.expenseStreams || []).forEach(stream => {
      if (stream.frequency === 'once') return
      getOccurrencesBetween(stream, savedAt, now).forEach(date => {
        expenseTxs.push({
          name: stream.name + ' (auto)',
          amount: -Math.abs(stream.amount),
          accountId: stream.accountId,
          accountType: stream.accountType || 'regular',
          date: format(date, 'yyyy-MM-dd'),
          budgetCategory: stream.budgetCategory || '',
          note: 'Catch up from load',
          createdAt: new Date().toISOString(),
          label: `${stream.name} - ${fmt(stream.amount)} on ${format(date, 'MMM d')}`,
        })
      })
    })

    //if no catch-up needed, import directly
    if (incomeTxs.length === 0 && expenseTxs.length === 0) {
      store.importState(parsed)
      return
    }

    //select all transactions by default
    const sel = {}
    ;[...incomeTxs, ...expenseTxs].forEach((_, i) => { sel[i] = true })
    setSelected(sel)
    setCatchUpModal({ parsed, incomeTxs, expenseTxs, daysDiff, monthCrossed })
  }

  //open catch-up modal
  const allTxs = catchUpModal ? [...catchUpModal.incomeTxs, ...catchUpModal.expenseTxs] : []
  const totalSelected = Object.values(selected).filter(Boolean).length
  const handleApplyCatchUp = () => {
    const chosen = allTxs.filter((_, i) => selected[i])
    store.importState(catchUpModal.parsed, { catchUpTransactions: chosen })
    setCatchUpModal(null)
  }
  const handleSkipCatchUp = () => {
    store.importState(catchUpModal.parsed)
    setCatchUpModal(null)
  }

  return (
    <>
    {/*save/load buttons*/}
      <div className="saveloadBtns">
        <button className="btn btnSecondary btnSm" onClick={handleSave} title="Save data to file">
          <Download size={14} /> Save
        </button>
        <button className="btn btnSecondary btnSm" onClick={() => fileRef.current?.click()} title="Load data from file">
          <Upload size={14} /> Load
        </button>
        <input ref={fileRef} type="file" accept=".json,.cly" style={{ display: 'none' }} onChange={handleLoadFile} />
      </div>

      {/*save password modal */}
      {showSavePw && (
        <PasswordModal
          mode="encrypt"
          onConfirm={doSave}
          onSkip={() => { doSave(null) }}
          onCancel={() => setShowSavePw(false)}
        />
      )}

      {/*load modal */}
      {showLoadPw && (
        <PasswordModal
          mode="decrypt"
          onConfirm={handleDecrypt}
          onCancel={() => { setShowLoadPw(false); setLoadRaw(null) }}
        />
      )}

      {/* catch-up modal */}
      {catchUpModal && (
        <Modal
          title={`Load Data - ${catchUpModal.daysDiff} day${catchUpModal.daysDiff !== 1 ? 's' : ''} since last save`}
          onClose={handleSkipCatchUp}
        >
          {/*action buttons*/}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button className="btn btnSecondary" onClick={handleSkipCatchUp}>Load Without Catch Up</button>
            <button className="btn btnPrimary" onClick={handleApplyCatchUp}>
              Apply {totalSelected > 0 ? `(${totalSelected})` : ''} and Load
            </button>
          </div>

          {/*month change notice*/}
          {catchUpModal.monthCrossed && (
            <div className="catchupNotice">
              A new month has started since your last save. Budget spending resets automatically.
            </div>
          )}

          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>
            Select which recurring transactions to auto-generate since your last save:
          </p>

          {/*income section*/}
          {catchUpModal.incomeTxs.length > 0 && (
            <>
              <div className="catchupSectionLabel">Income ({catchUpModal.incomeTxs.length})</div>
              {catchUpModal.incomeTxs.map((tx, i) => (
                <label key={i} className="catchupRow" onClick={() => setSelected(s => ({ ...s, [i]: !s[i] }))}>
                  {selected[i] ? <CheckSquare size={16} color="var(--green-600)" /> : <Square size={16} color="var(--gray-400)" />}
                  <span className="catchupLabel">{tx.label}</span>
                  <span className="badge badgeGreen">{fmt(tx.amount)}</span>
                </label>
              ))}
            </>
          )}
           {/*expense section*/}
          {catchUpModal.expenseTxs.length > 0 && (
            <>
              <div className="catchupSectionLabel" style={{ marginTop: 12 }}>Expenses ({catchUpModal.expenseTxs.length})</div>
              {catchUpModal.expenseTxs.map((tx, i2) => {
                const i = catchUpModal.incomeTxs.length + i2
                return (
                  <label key={i} className="catchupRow" onClick={() => setSelected(s => ({ ...s, [i]: !s[i] }))}>
                    {selected[i] ? <CheckSquare size={16} color="var(--green-600)" /> : <Square size={16} color="var(--gray-400)" />}
                    <span className="catchupLabel">{tx.label}</span>
                    <span className="badge badgeRed">{fmt(Math.abs(tx.amount))}</span>
                  </label>
                )
              })}
            </>
          )}
        </Modal>
      )}
    </>
  )
}
