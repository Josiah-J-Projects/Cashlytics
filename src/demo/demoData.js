//preset data for demo mode. 
const today = new Date()
const dateStr = (offsetDays = 0) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const monthStart = new Date(today.getFullYear(), today.getMonth() -6, 1).toISOString().slice(0, 10)

export const demoData = {
  savedAt: null, // skip catch-up prompt on load
  version: 2,

  accounts: [
    {id: 'acc1', name: 'Chequing', category: 'Cash', balance: 3240.50, note: 'Main spending account' },
    {id: 'acc2', name: 'Vacation Fund', category: 'Savings', balance: 1800.00, note: 'Money set aside for vacation' },
    {id: 'acc3', name: 'Investment Account', category: 'Investment', balance: 28500.00, note: 'Long-term investments' },
    {id: 'acc4', name: 'Emergency Fund',  category: 'Emergency', balance: 5000.00,  note: '3-month emergency buffer' },
  ],

  incomeStreams: [
    {id: 'inc1', name: 'Salary', amount: 4000, frequency: 'monthly', accountId: 'acc1', startDate: monthStart },
    { id: 'inc2', name: 'Freelance Income', amount: 600, frequency: 'biweekly',  accountId: 'acc1', startDate: new Date(today.getFullYear(), today.getMonth() -3, 1).toISOString().slice(0, 10) },
  ],

  creditAccounts: [
    { id: 'crd1', name: 'Credit Card', limit: 5000,  balance: 840.00,  interestRate: 19.99, compounding: 'monthly', gracePeriod: 21, accruedInterest: 0, creditBalance: 0 },
    {id: 'crd2', name: 'Line of Credit', limit: 15000, balance: 2300.00, interestRate: 8.45,  compounding: 'monthly', gracePeriod: 0,  accruedInterest: 16.23, creditBalance: 0 },
  ],

  expenseStreams: [
    {id: 'exp1', name: 'Rent',amount: 3000, frequency: 'monthly',  accountId: 'acc1', accountType: 'regular', budgetCategory: 'cat1', startDate: monthStart },
    {id: 'exp2', name: 'Movie Subscription', amount: 18, frequency: 'monthly',  accountId: 'crd2', accountType: 'credit',  budgetCategory: 'cat4', startDate: monthStart },
    {id: 'exp3', name: 'Gym Membership', amount: 45,   frequency: 'monthly',  accountId: 'crd2', accountType: 'credit',  budgetCategory: 'cat4', startDate: monthStart },
    { id: 'exp4', name: 'Transit Pass',amount: 110,  frequency: 'monthly',  accountId: 'acc1', accountType: 'regular', budgetCategory: 'cat3', startDate: monthStart },
  ],

  budgetCategories: [
    {id: 'cat1', name: 'Rent',allocated: 2511, allocationType: 'fixed', color: '#3b82f6' },
    {id: 'cat2', name: 'Groceries', allocated: 600, allocationType: 'fixed',color: '#16a34a' },
    {id: 'cat3', name: 'Transportation', allocated: 110, allocationType: 'fixed', color: '#f59e0b' },
    {id: 'cat4', name: 'Subscriptions', allocated: 100, allocationType: 'fixed', color: '#06b6d4' },
    {id: 'cat5', name: 'Miscellaneous Expenses', allocated: 5, allocationType: 'percentage', color: '#ec4899' },
    {id: 'cat6', name: 'Dining Out', allocated: 200,  allocationType: 'fixed', color: '#f97316' },
    {id: 'cat7', name: 'Savings/Investments', allocated: 20,  allocationType: 'percentage', color: '#f97316' },
  ],

  transactions: [
    {id: 't1', name: 'Bonus', amount: 5000, accountId: 'acc1', accountType: 'regular', date: dateStr(-126), budgetCategory: '', note: '', createdAt: new Date(today - 126*86400000).toISOString() },
    {id: 't2', name: 'Grocery Run', amount: -127.43, accountId: 'crd1', accountType: 'credit',  date: dateStr(-78), budgetCategory: 'cat2', note: '', createdAt: new Date(today - 78*86400000).toISOString() },
    {id: 't3', name: 'Take Out',amount: -68.50,  accountId: 'crd1', accountType: 'credit',  date: dateStr(-51),  budgetCategory: 'cat6', note: 'Sushi place', createdAt: new Date(today -51*86400000).toISOString() },
    {id: 't4', name: 'Debt Payment',amount: -2098, accountId: 'acc4', accountType: 'regular',  date: dateStr(-49),  budgetCategory: 'cat7', note: '', createdAt: new Date(today -49*86400000).toISOString() },
    {id: 't5', name: 'Freelance Invoice',amount: 500, accountId: 'acc1', accountType: 'regular', date: dateStr(-46),  budgetCategory: '',     note: '', createdAt: new Date(today - 46*86400000).toISOString() },
    {id: 't6', name: 'Taxi',amount: -110,accountId: 'acc1', accountType: 'regular', date: dateStr(-37),  budgetCategory: 'cat3', note: '', createdAt: new Date(today - 37*86400000).toISOString() },
    {id: 't7', name: 'Grocery Run', amount: -289.12, accountId: 'crd1', accountType: 'credit', date: dateStr(-16), budgetCategory: 'cat2', note: '',createdAt: new Date(today - 16*86400000).toISOString() },
    {id: 't8', name: 'Coffee', amount: -12.50, accountId: 'crd1', accountType: 'credit',  date: dateStr(-12),  budgetCategory: 'cat5', note: '', createdAt: new Date(today - 12*86400000).toISOString() },
    {id: 't9', name: 'Hiking Trip', amount: -85, accountId: 'crd1', accountType: 'credit',  date: dateStr(-1),  budgetCategory: 'cat5', note: '', createdAt: new Date(today - 1*86400000).toISOString() },
  ],
  accountTransfers: [
    {id: 'tr1', name: 'Investment Contribution', amount: 500, fromId: 'acc1', fromType: 'regular', toId: 'acc3', toType: 'regular', frequency: 'monthly', startDate: monthStart, budgetCategory: 'cat7', customEvery: 1, customUnit: 'months',},
    {id: 'tr2', name: 'Vacation Fund Top-up', amount: 500, fromId: 'acc1', fromType: 'regular', toId: 'acc2', toType: 'regular', frequency: 'monthly', startDate: monthStart, budgetCategory: 'cat7', customEvery: 1, customUnit: 'months',},
  ],

  transferLog: [],
}
