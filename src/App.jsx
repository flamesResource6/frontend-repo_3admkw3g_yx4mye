import { useEffect, useMemo, useRef, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function App() {
  const [input, setInput] = useState('')
  const [sessionId] = useState(() => Math.random().toString(36).slice(2))
  const [messages, setMessages] = useState([])
  const [notes, setNotes] = useState([])
  const [targetLang, setTargetLang] = useState('auto')
  const [loading, setLoading] = useState(false)

  const languages = useMemo(() => [
    { code: 'auto', name: 'Auto' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
  ], [])

  const chatEndRef = useRef(null)
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchNotes = async () => {
    const res = await fetch(`${BACKEND}/api/memory`)
    const data = await res.json()
    setNotes(data.items || [])
  }
  useEffect(() => { fetchNotes() }, [])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    setLoading(true)
    const userMsg = { role: 'user', text }
    setMessages(m => [...m, userMsg])

    // log conversation
    fetch(`${BACKEND}/api/conversation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', text, session_id: sessionId })
    }).catch(()=>{})

    // ask question (optionally translate)
    let payload = { question: text }
    if (targetLang !== 'auto') payload.target_lang = targetLang

    try {
      const res = await fetch(`${BACKEND}/api/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      const answer = data.answer || 'Sorry, I could not generate an answer.'
      const botMsg = { role: 'assistant', text: answer }
      setMessages(m => [...m, botMsg])
      // log assistant turn
      fetch(`${BACKEND}/api/conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', text: answer, session_id: sessionId })
      }).catch(()=>{})
    } catch (e) {
      const botMsg = { role: 'assistant', text: 'There was an error answering. Please try again.' }
      setMessages(m => [...m, botMsg])
    } finally {
      setLoading(false)
    }
  }

  const saveNote = async (content, tags=[]) => {
    if (!content.trim()) return
    await fetch(`${BACKEND}/api/memory`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tags, language: targetLang === 'auto' ? undefined : targetLang })
    })
    setInput('')
    fetchNotes()
  }

  const onSubmit = (e) => { e.preventDefault(); sendMessage(input) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <header className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Study Assistant</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Answer in:</label>
          <select value={targetLang} onChange={e=>setTargetLang(e.target.value)} className="border rounded px-2 py-1 text-sm">
            {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <a href="/test" className="text-sm text-blue-600 hover:underline">Status</a>
        </div>
      </header>

      <main className="grid md:grid-cols-2 gap-6 p-6">
        <section className="bg-white rounded-lg shadow p-4 flex flex-col h-[70vh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.map((m, i) => (
              <div key={i} className={"max-w-[90%] rounded p-3 " + (m.role === 'user' ? 'bg-blue-50 self-end ml-auto' : 'bg-gray-50')}>
                <p className="text-gray-800 whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={onSubmit} className="mt-3 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything… (any language)" className="flex-1 border rounded px-3 py-2" />
            <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">Send</button>
          </form>
          <div className="mt-2 text-xs text-gray-500">Tip: Select a language to get answers translated automatically.</div>
        </section>

        <section className="bg-white rounded-lg shadow p-4 h-[70vh] flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Your Memory</h2>
          <div className="flex gap-2 mb-3">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Write a fact or note to save…" className="flex-1 border rounded px-3 py-2" />
            <button onClick={()=>saveNote(input)} className="bg-emerald-600 text-white px-3 py-2 rounded">Save</button>
          </div>
          <div className="overflow-y-auto space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="border rounded p-3">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</div>
                {n.tags && n.tags.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">Tags: {n.tags.join(', ')}</div>
                )}
              </div>
            ))}
            {notes.length === 0 && (
              <div className="text-sm text-gray-500">No notes yet. Add your first memory above.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
