import React, { createContext, useContext, useState } from 'react'

export const AppContext = createContext({
  openTxModal: () => {},
  closeTxModal: () => {},
  txModalOpen: false,
  txModalDate: null,
})

export function AppProvider({ children }) {
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txModalDate, setTxModalDate] = useState(null)

  const openTxModal = (date = null) => {
    setTxModalDate(date)
    setTxModalOpen(true)
  }
  const closeTxModal = () => setTxModalOpen(false)

  return (
    <AppContext.Provider value={{ openTxModal, closeTxModal, txModalOpen, txModalDate }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() { return useContext(AppContext) }
