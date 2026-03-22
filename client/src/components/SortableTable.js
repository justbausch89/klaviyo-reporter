import React, { useState, useMemo } from 'react';
import './SortableTable.css';

export default function SortableTable({ columns, rows, defaultSort, defaultDir = 'desc', emptyMessage = 'No data available' }) {
  const [sortKey, setSortKey] = useState(defaultSort || columns[0]?.key);
  const [sortDir, setSortDir] = useState(defaultDir);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="table-wrapper">
      <table className="sortable-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.align || ''} ${sortKey === col.key ? 'active' : ''} ${col.sortable !== false ? 'sortable' : ''}`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                <span className="th-inner">
                  {col.label}
                  {col.sortable !== false && (
                    <span className="sort-icon">
                      {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">{emptyMessage}</td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr key={row.id || i} className={row._highlight ? 'highlighted' : ''}>
                {columns.map((col) => (
                  <td key={col.key} className={col.align || ''}>
                    {col.render ? col.render(row[col.key], row) : renderDefault(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderDefault(value, format) {
  if (value == null) return <span className="null-val">—</span>;
  switch (format) {
    case 'currency':
      return <span className="mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}</span>;
    case 'percent':
      return <span className="mono">{(value * 100).toFixed(1)}%</span>;
    case 'number':
      return <span className="mono">{new Intl.NumberFormat('en-US').format(Math.round(value))}</span>;
    case 'date':
      return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    default:
      return value;
  }
}
