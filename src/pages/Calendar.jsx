import React, { useState, useMemo } from 'react'
import { useStore, fmt, getNextOccurrences, useDevStore } from '../store/index.js'
import TransactionModal from '../components/TransactionModal.jsx'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameMonth, getDay, parseISO, isWithinInterval } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CalendarPage() {
  //get data and actions from global store
  const { incomeStreams, expenseStreams, transactions, accounts, creditAccounts } = useStore()
  const { timeOffset } = useDevStore()
  const now = new Date(Date.now() + timeOffset)
  //state for current month and modal date
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [txModalDate, setTxModalDate] = useState(null)

  //month boundaries
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  //build calendar events
  const allEvents = useMemo(() => {
    const events = {}

     //helper to add event by date
    const add = (date, evt) => {
      const key = format(date, 'yyyy-MM-dd')
      if (!events[key]) events[key] = []
      events[key].push(evt)
    }

    //add income stream based on date
    incomeStreams.forEach(stream => {
      getNextOccurrences(stream, monthStart, 15).forEach(d => {
        if (d >= monthStart && d <= monthEnd) {
          const acct = accounts.find(a => a.id === stream.accountId)
          add(d, { type: 'income', label: `${stream.name} (${fmt(stream.amount, true)})` })
        }
      })
    })
    //add expense stream based on date
    expenseStreams.forEach(stream => {
      getNextOccurrences(stream, monthStart, 15).forEach(d => {
        if (d >= monthStart && d <= monthEnd) {
          add(d, { type: 'expense', label: `${stream.name} (${fmt(stream.amount, true)})` })
        }
      })
    })

    //add manual transactions
    transactions.forEach(tx => {
      try {
        const d = new Date(tx.date + 'T12:00:00')
        if (d >= monthStart && d <= monthEnd) {
          add(d, { type: tx.amount >= 0 ? 'income' : 'expense', label: `${tx.name} (${fmt(Math.abs(tx.amount), true)})`, isTransaction: true })
        }
      } catch {}
    })

    return events
  }, [incomeStreams, expenseStreams, transactions, currentMonth])

  //generate days for calendar grid
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)
  const paddedDays = [...Array(startPad).fill(null), ...days]
  while (paddedDays.length % 7 !== 0) paddedDays.push(null)

  //generate upcoming events list
  const upcomingEvents = useMemo(() => {
    const result = []
    Object.entries(allEvents).forEach(([dateStr, evts]) => {
      const d = new Date(dateStr + 'T12:00:00')
      if (d >= now) evts.forEach(e => result.push({ ...e, date: d, dateStr }))
    })
    return result.sort((a,b) => a.date - b.date).slice(0, 12)
  }, [allEvents, now])

  const handleDayClick = (day) => {
    if (!day) return
    setTxModalDate(format(day, 'yyyy-MM-dd'))
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div><h1 className="pageTitle">Calendar</h1><div className="pageSubtitle">Click any day to add a transaction on that date</div></div>
        {/*month navigation*/}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btnSecondary btnSm btnIcon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
          <span style={{ fontFamily: 'Outfit', fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{format(currentMonth, 'MMMM yyyy')}</span>
          <button className="btn btnSecondary btnSm btnIcon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
          <button className="btn btnSecondary btnSm" onClick={() => setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Today</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <div>
          {/*calendar grid*/}
          <div className="calGrid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="calHeaderCell">{d}</div>
            ))}
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="calCell otherMonth" />
              const key = format(day, 'yyyy-MM-dd')
              const events = allEvents[key] || []
              const isTodayCell = isToday(day)
              return (
                <div key={key}
                  className={`calCell${!isSameMonth(day, currentMonth) ? ' otherMonth' : ''}${isTodayCell ? ' today' : ''} calCellClickable`}
                  onClick={() => handleDayClick(day)}
                  title={`Add transaction on ${format(day, 'MMM d')}`}>
                  <div className="calDay">{format(day, 'd')}</div>
                  {events.slice(0, 3).map((evt, j) => (
                    <div key={j} className={`calEvent ${evt.type}`} title={evt.label}>{evt.label}</div>
                  ))}
                  {events.length > 3 && <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>+{events.length - 3} more</div>}
                </div>
              )
            })}
          </div>

            {/*legend*/}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--gray-500)' }}>
            <span><span style={{ background: 'var(--green-100)', color: 'var(--green-800)', padding: '2px 8px', borderRadius: 4, marginRight: 4 }}>■</span>Income</span>
            <span><span style={{ background: 'var(--red-100)', color: 'var(--red-500)', padding: '2px 8px', borderRadius: 4, marginRight: 4 }}>■</span>Expense</span>
            <span style={{ color: 'var(--gray-400)', marginLeft: 8 }}>Legend</span>
          </div>
        </div>

        {/*upcoming events*/}
        <div className="card">
          <div className="cardHeader" style={{ marginBottom: 12 }}><div className="cardTitle">Upcoming</div></div>
          {upcomingEvents.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: '20px 0', textAlign: 'center' }}>No upcoming events</div>
          ) : upcomingEvents.map((evt, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < upcomingEvents.length-1 ? '1px solid var(--gray-100)' : 'none' }}>
              <div style={{ minWidth: 44, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{format(evt.date, 'MMM').toUpperCase()}</div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, lineHeight: 1.1, color: 'var(--gray-900)' }}>{format(evt.date, 'd')}</div>
              </div>
              {/*event info*/}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-900)' }}>{evt.label.split(' (')[0]}</div>
                <div style={{ fontSize: 12, color: evt.type === 'income' ? 'var(--green-600)' : 'var(--red-500)', marginTop: 2, fontWeight: 600 }}>
                  {evt.label.match(/\(([^)]+)\)/)?.[1] || ''}
                </div>
              </div>
              <span className={`badge ${evt.type === 'income' ? 'badgeGreen' : 'badgeRed'}`}>{evt.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/*transaction modal*/}
      {txModalDate && (
        <TransactionModal defaultDate={txModalDate} onClose={() => setTxModalDate(null)} />
      )}
    </div>
  )
}
