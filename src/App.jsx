import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const SOURCES = [
  'Personal Expenses',
  'Family Expenses',
  'Asset 1 Bill',
  'Asset 2 Bill',
  'Asset 3 Bill',
  'Asset 4 Bill',
  'Asset 5 Bill',
  'Rental Money',
  'Other Investments',
]

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

const defaultForm = {
  description: '',
  source: SOURCES[0],
  type: 'expense',
  amount: '',
  entryDate: new Date().toISOString().slice(0, 10),
}

function App() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEntries = async () => {
      if (!supabase) {
        setError('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load data.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('cashflow_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setEntries(data ?? [])
      }

      setLoading(false)
    }

    fetchEntries()
  }, [])

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const value = Number(entry.amount || 0)
        if (entry.entry_type === 'income') {
          acc.income += value
        } else {
          acc.expense += value
        }
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [entries])

  const sourceTotals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const value = Number(entry.amount || 0)
      const direction = entry.entry_type === 'income' ? 1 : -1
      acc[entry.source] = (acc[entry.source] ?? 0) + value * direction
      return acc
    }, {})
  }, [entries])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!supabase) {
      setError('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before saving entries.')
      return
    }

    setSubmitting(true)
    setError('')

    const payload = {
      description: form.description.trim(),
      source: form.source,
      entry_type: form.type,
      amount: Number(form.amount),
      entry_date: form.entryDate,
    }

    const { data, error: insertError } = await supabase
      .from('cashflow_entries')
      .insert(payload)
      .select()
      .limit(1)

    if (insertError) {
      setError(insertError.message)
    } else if (data?.[0]) {
      setEntries((current) => [data[0], ...current])
      setForm((current) => ({ ...defaultForm, entryDate: current.entryDate }))
    }

    setSubmitting(false)
  }

  return (
    <main className="app">
      <header>
        <h1>Kewangan Dashboard</h1>
        <p>Track personal, family, asset bills, rental money, and investment cashflow.</p>
      </header>

      <section className="panel">
        <h2>Add Entry</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            required
          />
          <select name="source" value={form.source} onChange={handleChange}>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={handleChange}
            required
          />
          <input type="date" name="entryDate" value={form.entryDate} onChange={handleChange} required />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel totals">
        <article>
          <h3>Total Income</h3>
          <p>RM {totals.income.toFixed(2)}</p>
        </article>
        <article>
          <h3>Total Expense</h3>
          <p>RM {totals.expense.toFixed(2)}</p>
        </article>
        <article>
          <h3>Net Cashflow</h3>
          <p>RM {(totals.income - totals.expense).toFixed(2)}</p>
        </article>
      </section>

      <section className="panel">
        <h2>Entries</h2>
        {loading ? <p>Loading...</p> : null}
        {!loading && entries.length === 0 ? <p>No entries yet.</p> : null}
        <ul className="entries">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.description}</strong>
                <span>{entry.source}</span>
              </div>
              <div>
                <span>{entry.entry_date}</span>
                <strong className={entry.entry_type === 'income' ? 'income' : 'expense'}>
                  {entry.entry_type === 'income' ? '+' : '-'}RM {Number(entry.amount).toFixed(2)}
                </strong>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Source Summary</h2>
        <ul className="summary">
          {SOURCES.map((source) => (
            <li key={source}>
              <span>{source}</span>
              <strong>RM {(sourceTotals[source] ?? 0).toFixed(2)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
