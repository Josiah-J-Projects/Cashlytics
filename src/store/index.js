import { create } from 'zustand'
import { format, addDays, addMonths, addYears, isAfter, isBefore } from 'date-fns'

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

//dev mode
export const useDevStore = create((set, get) => ({
  enabled: false,
  timeOffset: 0,
  enable: () => set({ enabled: true }),
  advanceTime: (days) => set(s => ({ timeOffset: s.timeOffset + days * 86400000 })),
  resetTime: () => set({ timeOffset: 0 }),
  getDevNow: () => new Date(Date.now() + get().timeOffset),
}))

export function getDevNow() { return new Date(Date.now() + useDevStore.getState().timeOffset) }
export function todayStr() { return format(getDevNow(), 'yyyy-MM-dd') }

//credit helpers
export function calcMinPayment(balance) {
  if (!balance || balance <= 0) return 0
  if (balance < 10) return parseFloat(balance.toFixed(2))
  return parseFloat(Math.max(balance * 0.03, 10).toFixed(2))
}

//occurence helpers
function advanceDate(date, freq, every, unit) {
  const n = parseInt(every) || 1
  switch (freq) {
    case 'daily':     return addDays(date, 1)
    case 'weekly':    return addDays(date, 7)
    case 'biweekly':  return addDays(date, 14)
    case 'monthly':   return addMonths(date, 1)
    case 'quarterly': return addMonths(date, 3)
    case 'annually':  return addYears(date, 1)
    case 'custom':
      if (unit === 'days')   return addDays(date, n)
      if (unit === 'weeks')  return addDays(date, n * 7)
      if (unit === 'months') return addMonths(date, n)
      if (unit === 'years')  return addYears(date, n)
      return null
    default: return null
  }
}

export function getNextOccurrences(stream, from, count = 5) {
  if (!stream.frequency || stream.frequency === 'once') return []
  const results = []
  let cur = new Date(stream.startDate ? stream.startDate + 'T12:00:00' : from)
  const fromDate = new Date(from)
  let safety = 0
  while (isBefore(cur, fromDate) && safety++ < 500) {
    const next = advanceDate(cur, stream.frequency, stream.customEvery, stream.customUnit)
    if (!next) return results
    cur = next
  }
  safety = 0
  while (results.length < count && safety++ < 500) {
    if (!isBefore(cur, fromDate)) results.push(new Date(cur))
    if (stream.frequency === 'once') break
    const next = advanceDate(cur, stream.frequency, stream.customEvery, stream.customUnit)
    if (!next) break
    cur = next
  }
  return results
}

export function getOccurrencesBetween(stream, afterDate, beforeDate) {
  if (!stream.frequency || stream.frequency === 'once') return []
  const results = []
  let cur = new Date(stream.startDate ? stream.startDate + 'T12:00:00' : afterDate)
  let safety = 0
  //advance to first occurrence after 'afterDate'
  while (!isAfter(cur, afterDate) && safety++ < 1000) {
    const next = advanceDate(cur, stream.frequency, stream.customEvery, stream.customUnit)
    if (!next) return results
    cur = next
  }
  safety = 0
  while (!isAfter(cur, beforeDate) && safety++ < 200) {
    results.push(new Date(cur))
    const next = advanceDate(cur, stream.frequency, stream.customEvery, stream.customUnit)
    if (!next) break
    cur = next
  }
  return results
}

//global app state (accounts, transactions, etc.)
export const useStore = create((set, get) => ({
      accounts: [],
      incomeStreams: [],
      creditAccounts: [],
      expenseStreams: [],
      budgetCategories: [],
      transactions: [],

      // Reordering (for drag-and-drop)
      reorderAccounts:        (items) => set({ accounts: items }),
      reorderIncomeStreams:    (items) => set({ incomeStreams: items }),
      reorderCreditAccounts:  (items) => set({ creditAccounts: items }),
      reorderExpenseStreams:   (items) => set({ expenseStreams: items }),
      reorderBudgetCategories:(items) => set({ budgetCategories: items }),

      // accounts
      addAccount: (data) => set(s => ({
        accounts: [...s.accounts, { ...data, id: uid(), balance: parseFloat(data.balance) || 0 }]
      })),
      updateAccount: (id, data) => set(s => ({
        accounts: s.accounts.map(a => a.id === id ? { ...a, ...data, balance: parseFloat(data.balance ?? a.balance) } : a)
      })),
      deleteAccount: (id) => set(s => ({ accounts: s.accounts.filter(a => a.id !== id) })),

      //income streams
      addIncomeStream: (data) => set(s => ({
        incomeStreams: [...s.incomeStreams, { ...data, id: uid(), amount: parseFloat(data.amount) }]
      })),
      updateIncomeStream: (id, data) => set(s => ({
        incomeStreams: s.incomeStreams.map(x => x.id === id ? { ...x, ...data, amount: parseFloat(data.amount ?? x.amount) } : x)
      })),
      deleteIncomeStream: (id) => set(s => ({ incomeStreams: s.incomeStreams.filter(x => x.id !== id) })),

      //credit accounts
      addCreditAccount: (data) => set(s => ({
        creditAccounts: [...s.creditAccounts, {
          ...data, id: uid(),
          balance: parseFloat(data.balance) || 0,
          limit: parseFloat(data.limit),
          interestRate: parseFloat(data.interestRate),
          accruedInterest: parseFloat(data.accruedInterest) || 0,
          creditBalance: 0,
          gracePeriod: parseInt(data.gracePeriod) || 0,
        }]
      })),
      updateCreditAccount: (id, data) => set(s => ({
        creditAccounts: s.creditAccounts.map(a => a.id === id ? {
          ...a, ...data,
          balance: parseFloat(data.balance ?? a.balance),
          limit: parseFloat(data.limit ?? a.limit),
          interestRate: parseFloat(data.interestRate ?? a.interestRate),
          accruedInterest: parseFloat(data.accruedInterest ?? a.accruedInterest),
        } : a)
      })),
      deleteCreditAccount: (id) => set(s => ({ creditAccounts: s.creditAccounts.filter(a => a.id !== id) })),

      // expense streams
      addExpenseStream: (data) => set(s => ({
        expenseStreams: [...s.expenseStreams, { ...data, id: uid(), amount: parseFloat(data.amount) }]
      })),
      updateExpenseStream: (id, data) => set(s => ({
        expenseStreams: s.expenseStreams.map(x => x.id === id ? { ...x, ...data, amount: parseFloat(data.amount ?? x.amount) } : x)
      })),
      deleteExpenseStream: (id) => set(s => ({ expenseStreams: s.expenseStreams.filter(x => x.id !== id) })),

      // categories for budgeting
      addBudgetCategory: (data) => set(s => ({
        budgetCategories: [...s.budgetCategories, { ...data, id: uid(), allocated: parseFloat(data.allocated) || 0 }]
      })),
      updateBudgetCategory: (id, data) => set(s => ({
        budgetCategories: s.budgetCategories.map(c => c.id === id ? { ...c, ...data, allocated: parseFloat(data.allocated ?? c.allocated) } : c)
      })),
      deleteBudgetCategory: (id) => set(s => ({
        budgetCategories: s.budgetCategories.filter(c => c.id !== id)
      })),

      // transactions
      addTransaction: (data) => {
        const tx = {
          ...data,
          id: uid(),
          amount: parseFloat(data.amount),
          date: data.date || todayStr(),
          createdAt: new Date().toISOString(),
        }
        set(s => {
          const newState = { transactions: [...s.transactions, tx] }
          const amt = tx.amount
          if (tx.accountType === 'regular' && tx.accountId) {
            newState.accounts = s.accounts.map(a =>
              a.id === tx.accountId ? { ...a, balance: (a.balance || 0) + amt } : a
            )
          } else if (tx.accountType === 'credit' && tx.accountId) {
            newState.creditAccounts = s.creditAccounts.map(a => {
              if (a.id !== tx.accountId) return a
              if (amt > 0) {
                let rem = amt
                //pay interest first, then principal
                const interest = Math.min(a.accruedInterest || 0, rem); rem -= interest
                const principal = Math.min(a.balance || 0, rem); rem -= principal
                return {
                  ...a,
                  accruedInterest: Math.max(0, (a.accruedInterest || 0) - interest),
                  balance: Math.max(0, (a.balance || 0) - principal),
                  creditBalance: (a.creditBalance || 0) + rem,
                }
              } else {
                // for charges, use up creditBalance first, then increase debt
                const charge = Math.abs(amt)
                const creditUsed = Math.min(a.creditBalance || 0, charge)
                const debtIncrease = charge - creditUsed
                return {
                  ...a,
                  creditBalance: (a.creditBalance || 0) - creditUsed,
                  balance: (a.balance || 0) + debtIncrease,
                }
              }
            })
          }
          return newState
        })
      },
      deleteTransaction: (id) => {
        const tx = get().transactions.find(t => t.id === id)
        if (!tx) return
        set(s => {
          const newState = { transactions: s.transactions.filter(t => t.id !== id) }
          const amt = tx.amount
          if (tx.accountType === 'regular' && tx.accountId) {
            newState.accounts = s.accounts.map(a =>
              a.id === tx.accountId ? { ...a, balance: (a.balance || 0) - amt } : a
            )
          } else if (tx.accountType === 'credit' && tx.accountId) {
            newState.creditAccounts = s.creditAccounts.map(a => {
              if (a.id !== tx.accountId) return a
              if (amt > 0) {
                return { ...a, balance: (a.balance || 0) + amt, creditBalance: Math.max(0, (a.creditBalance || 0) - amt) }
              } else {
                return { ...a, balance: Math.max(0, (a.balance || 0) - Math.abs(amt)) }
              }
            })
          }
          return newState
        })
      },
      exportState: () => {
        const s = get()
        return JSON.stringify({
          accounts: s.accounts,
          incomeStreams: s.incomeStreams,
          creditAccounts: s.creditAccounts,
          expenseStreams: s.expenseStreams,
          budgetCategories: s.budgetCategories,
          transactions: s.transactions,
          savedAt: new Date().toISOString(),
          version: 2,
        }, null, 2)
      },
      importState: (parsed, options = {}) => {
        const base = {
          accounts: parsed.accounts || [],
          incomeStreams: parsed.incomeStreams || [],
          creditAccounts: parsed.creditAccounts || [],
          expenseStreams: parsed.expenseStreams || [],
          budgetCategories: parsed.budgetCategories || [],
          transactions: parsed.transactions || [],
        }
        if (options.catchUpTransactions && options.catchUpTransactions.length > 0) {
          const newTxs = options.catchUpTransactions.map(tx => ({ ...tx, id: uid() }))
          let accounts = [...base.accounts]
          let creditAccounts = [...base.creditAccounts]
          newTxs.forEach(tx => {
            if (tx.accountType === 'regular' && tx.accountId) {
              accounts = accounts.map(a => a.id === tx.accountId ? { ...a, balance: (a.balance || 0) + tx.amount } : a)
            } else if (tx.accountType === 'credit' && tx.accountId) {
              creditAccounts = creditAccounts.map(a => {
                if (a.id !== tx.accountId) return a
                if (tx.amount > 0) {
                  let rem = tx.amount
                  const interest = Math.min(a.accruedInterest || 0, rem); rem -= interest
                  const principal = Math.min(a.balance || 0, rem); rem -= principal
                  return { ...a, accruedInterest: Math.max(0, (a.accruedInterest || 0) - interest), balance: Math.max(0, (a.balance || 0) - principal), creditBalance: (a.creditBalance || 0) + rem }
                } else {
                  const charge = Math.abs(tx.amount)
                  const creditUsed = Math.min(a.creditBalance || 0, charge)
                  return { ...a, creditBalance: (a.creditBalance || 0) - creditUsed, balance: (a.balance || 0) + charge - creditUsed }
                }
              })
            }
          })
          base.accounts = accounts
          base.creditAccounts = creditAccounts
          base.transactions = [...base.transactions, ...newTxs]
        }
        set(base)
      },
    })
)

//helpers for fotmatting and calculations
export const fmt = (n, compact = false) => {
  if (n == null || isNaN(n)) return '$0.00'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    notation: compact && Math.abs(n) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(n)
}

export const FREQ_LABELS = {
  once: 'One-time', daily: 'Daily', weekly: 'Weekly',
  biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually',
}

export const ACCOUNT_CATEGORIES = ['Cash', 'Savings', 'Investment', 'Emergency', 'Assets']
export const CATEGORY_COLORS = [
  '#16a34a','#22c55e','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316','#84cc16'
]

export function monthlyAmount(stream) {
  switch (stream.frequency) {
    case 'daily':     return stream.amount * 30.44
    case 'weekly':    return stream.amount * 4.33
    case 'biweekly':  return stream.amount * 2.17
    case 'monthly':   return stream.amount
    case 'quarterly': return stream.amount / 3
    case 'annually':  return stream.amount / 12
    default:          return 0
  }
}
