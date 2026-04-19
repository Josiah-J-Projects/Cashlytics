import React, { useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'

export function DraggableList({ items, onReorder, renderItem, keyExtractor }) {
  const dragIdx = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDragStart = (e, idx) => {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== idx) setDragOver(idx)
  }

  const handleDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) { setDragOver(null); return }
    const newItems = [...items]
    const [moved] = newItems.splice(dragIdx.current, 1)
    newItems.splice(idx, 0, moved)
    onReorder(newItems)
    dragIdx.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => { dragIdx.current = null; setDragOver(null) }

  return (
    <>
      {items.map((item, idx) => (
        <div
          key={keyExtractor(item)}
          draggable
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={e => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          onDragLeave={() => setDragOver(null)}
          style={{
            opacity: dragIdx.current === idx ? 0.4 : 1,
            borderTop: dragOver === idx && dragIdx.current !== idx
              ? '2px solid var(--green-500)' : '2px solid transparent',
            transition: 'opacity 0.15s, border-color 0.1s',
            cursor: 'grab',
          }}
        >
          {renderItem(item, idx, (
            <span className="dragHandle" title="Drag to reorder">
              <GripVertical size={15} />
            </span>
          ))}
        </div>
      ))}
    </>
  )
}
