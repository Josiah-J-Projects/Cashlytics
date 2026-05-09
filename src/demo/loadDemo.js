import { demoData } from './demoData.js'
import { getOccurrencesBetween } from '../store/index.js'
import { format } from 'date-fns'

const startMonths = 6
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)


//if '?demo' is in the URL, it will load the demo dataset into the store and returns true
export function maybeLoadDemo(importStateFn) {
  if (!window.location.search.includes('demo')) return false

  const now = new Date()
  const demoStart = new Date(now)
  demoStart.setMonth(demoStart.getMonth() - startMonths)
  demoStart.setDate(1) // start of that month

  const allAccounts = [
    ...(demoData.accounts || []).map(a => ({ id: a.id, name: a.name, type: 'regular' })),
    ...(demoData.creditAccounts || []).map(a => ({ id: a.id, name: a.name, type: 'credit' })),
  ]

  //generate transactions for every income stream
  const incomeTxs = []
  ;(demoData.incomeStreams || []).forEach(stream => {
    if (stream.frequency === 'once') return
    getOccurrencesBetween(stream, demoStart, now).forEach(date => {
      incomeTxs.push({
        name: stream.name,
        amount: stream.amount,
        accountId: stream.accountId,
        accountType: 'regular',
        date: format(date, 'yyyy-MM-dd'),
        budgetCategory: '',
        note: 'Auto-generated',
        createdAt: date.toISOString(),
      })
    })
  })

  //generate transactions for every expense stream
  const expenseTxs = []
  ;(demoData.expenseStreams || []).forEach(stream => {
    if (stream.frequency === 'once') return
    getOccurrencesBetween(stream, demoStart, now).forEach(date => {
      expenseTxs.push({
        name: stream.name,
        amount: -Math.abs(stream.amount),
        accountId: stream.accountId,
        accountType: stream.accountType || 'regular',
        date: format(date, 'yyyy-MM-dd'),
        budgetCategory: stream.budgetCategory || '',
        note: 'Auto-generated',
        createdAt: date.toISOString(),
      })
    })
  })
  //generate transactions for every automated transfer
  const transferTxs = []
  ;(demoData.accountTransfers || []).forEach(transfer => {
      if (transfer.frequency === 'once') return
      getOccurrencesBetween(transfer, demoStart, now).forEach(date => {
        const transferId = uid()
        const txFromId   = uid()
        const txToId     = uid()
        const dateStr    = format(date, 'yyyy-MM-dd')
  
        transferTxs.push({
          id: txFromId,
          pairedTxId: txToId,
          transferId,
          name: transfer.name,
          amount: -Math.abs(transfer.amount),
          accountId: transfer.fromId,
          accountType: transfer.fromType,
          budgetCategory: transfer.budgetCategory || '',
          date: dateStr,
          note: 'Transfer out',
          createdAt: date.toISOString(),
          isTransfer: true,
        })
        transferTxs.push({
          id: txToId,
          pairedTxId: txFromId,
          transferId,
          name: transfer.name,
          amount: Math.abs(transfer.amount),
          accountId: transfer.toId,
          accountType: transfer.toType,
          budgetCategory: '',
          date: dateStr,
          note: 'Transfer in',
          createdAt: date.toISOString(),
          isTransfer: true,
        })
      })
    })

  importStateFn(demoData, {
    catchUpTransactions: [...incomeTxs, ...expenseTxs, ...transferTxs],
  })

  return true
}