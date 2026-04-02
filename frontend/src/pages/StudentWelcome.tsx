import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const MODES = [
  { id: 'docking', title: '🧬 Molecular Docking', desc: 'Predict how molecules bind to proteins using Vina/GNINA', time: '~20 min', color: 'from-blue-500 to-cyan-500' },
  { id: 'chemdraw', title: '✏️ ChemDraw', desc: 'Draw molecules, calculate properties, optimize structures', time: '~15 min', color: 'from-green-500 to-emerald-500' },
  { id: 'pharmacophore', title: '💊 Pharmacophore', desc: 'Identify key interaction features for drug design', time: '~15 min', color: 'from-purple-500 to-pink-500' },
  { id: 'qsar', title: '📊 QSAR Modeling', desc: 'Build predictive models from molecular descriptors', time: '~20 min', color: 'from-orange-500 to-red-500' },
  { id: 'admet', title: '🛡️ ADMET Prediction', desc: 'Predict absorption, distribution, metabolism, excretion, toxicity', time: '~10 min', color: 'from-teal-500 to-blue-500' },
  { id: 'md', title: '🔬 Molecular Dynamics', desc: 'Simulate molecular motion and stability over time', time: '~25 min', color: 'from-indigo-500 to-purple-500' },
  { id: 'ai', title: '🤖 AI Assistant', desc: 'Ask questions about drug discovery and get AI-powered answers', time: 'Unlimited', color: 'from-pink-500 to-rose-500' },
  { id: 'benchmark', title: '🏆 Benchmarking', desc: 'Validate docking accuracy against PDBbind dataset', time: '~15 min', color: 'from-amber-500 to-orange-500' },
]

export function StudentWelcome() {
  const navigate = useNavigate()
  const [xp, setXp] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('student-progress')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setXp(data.xp || 0)
        setCompleted(data.completed || [])
      } catch {}
    }
  }, [])

  const level = Math.floor(xp / 100) + 1
  const xpInLevel = xp % 100

  const filtered = MODES.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center font-bold text-sm">BD</div>
            <div>
              <h1 className="text-lg font-bold">BioDockify Studio AI</h1>
              <p className="text-xs text-gray-400">Student Edition v4.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Level {level}</div>
              <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all" style={{ width: `${xpInLevel}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{xp} XP</div>
            </div>
            <button onClick={() => navigate('/')} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Full App →
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Welcome */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, Future Scientist! 👋</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            No experience needed. No expensive licenses. Learn computational chemistry with real drug discovery tools.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
            <span>✅ 100% free</span>
            <span>🔒 No account needed</span>
            <span>💻 Runs on any laptop</span>
            <span>📚 {completed.length}/{MODES.length} completed</span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search tutorials..."
            className="w-full max-w-md mx-auto block px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Mode Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(mode => {
            const done = completed.includes(mode.id)
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setXp(prev => prev + 10)
                  if (!completed.includes(mode.id)) {
                    const newCompleted = [...completed, mode.id]
                    setCompleted(newCompleted)
                    localStorage.setItem('student-progress', JSON.stringify({ xp: xp + 10, completed: newCompleted }))
                  }
                  navigate(`/${mode.id}`)
                }}
                className={`p-5 rounded-xl bg-gradient-to-br ${mode.color} hover:opacity-90 transition text-left group relative`}
              >
                {done && (
                  <span className="absolute top-2 right-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">✓ Done</span>
                )}
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{mode.title.split(' ')[0]}</div>
                <h3 className="text-base font-bold mb-1">{mode.title.split(' ').slice(1).join(' ')}</h3>
                <p className="text-xs text-white/80 mb-3">{mode.desc}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 bg-white/20 rounded">⏱ {mode.time}</span>
                  <span className="text-white/60 group-hover:text-white transition-colors">Start →</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 p-5 bg-gray-800/30 border border-gray-700/50 rounded-xl">
          <h3 className="font-semibold mb-3">💡 Quick Tips</h3>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-gray-400">
            <div><span className="text-cyan-400 font-medium">1.</span> Start with ChemDraw to learn molecule basics</div>
            <div><span className="text-cyan-400 font-medium">2.</span> Try Docking to see how drugs bind to proteins</div>
            <div><span className="text-cyan-400 font-medium">3.</span> Use AI Assistant for questions anytime</div>
          </div>
        </div>
      </main>
    </div>
  )
}
