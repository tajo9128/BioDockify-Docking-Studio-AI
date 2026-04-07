import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface MDJob {
  job_id: string
  status: string
  progress: number
  message: string
  updated_at?: string
  result?: {
    engine: string
    platform: string
    n_frames: number
    n_steps: number
    nvt_steps?: number
    npt_steps?: number
    sim_time_ns: number
    temperature_K: number
    pressure_bar?: number
    avg_energy_kj_mol: number
    solvent_type: string
    force_field: string
    trajectory_path: string
    final_frame_path: string
    energy_csv_path: string
    rmsd_angstrom: number[]
    rmsd_frames: number[]
    stability: string
    n_atoms?: number
    threads?: string
    note?: string
  }
  error?: string
}

interface Preset {
  label: string
  desc: string
  steps: number
  nvt_steps: number
  npt_steps: number
  solvent: string
}

const PRESETS: Preset[] = [
  { label: 'Quick Test', desc: '10 ps, vacuum', steps: 5000, nvt_steps: 1000, npt_steps: 1000, solvent: 'implicit' },
  { label: 'Standard', desc: '100 ps, implicit', steps: 50000, nvt_steps: 25000, npt_steps: 25000, solvent: 'implicit' },
  { label: 'Extended', desc: '1 ns, implicit', steps: 500000, nvt_steps: 50000, npt_steps: 50000, solvent: 'implicit' },
  { label: 'Extended + Water', desc: '1 ns, TIP3P', steps: 500000, nvt_steps: 50000, npt_steps: 50000, solvent: 'explicit' },
]

const FORCE_FIELDS = [
  { value: 'amber14-all', label: 'AMBER14 (all)' },
  { value: 'charmm36', label: 'CHARMM36' },
  { value: 'opls-aa', label: 'OPLS-AA' },
]

function MiniPlot({ data, label, color }: { data: number[]; label: string; color: string }) {
  if (!data.length) return null
  const w = 420, h = 120
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="mt-2">
      <p className="text-xs font-medium mb-1">{label}</p>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
        <line x1="0" y1={h - ((data[data.length - 1] - min) / range) * h} x2={w} y2={h - ((data[data.length - 1] - min) / range) * h} stroke={color} strokeWidth="0.5" strokeDasharray="4,2" opacity="0.5" />
      </svg>
      <p className="text-xs text-gray-500">Final: {data[data.length - 1]?.toFixed(3)}</p>
    </div>
  )
}

export function MoleculeDynamics() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [pdbFile, setPdbFile] = useState<File | null>(null)
  const [pdbContent, setPdbContent] = useState('')
  const [preset, setPreset] = useState(1)
  const [solventType, setSolventType] = useState('implicit')
  const [forceField, setForceField] = useState('amber14-all')
  const [temperature, setTemperature] = useState(300)
  const [pressure, setPressure] = useState(1.0)
  const [steps, setSteps] = useState(50000)
  const [nvtSteps, setNvtSteps] = useState(25000)
  const [nptSteps, setNptSteps] = useState(25000)
  const [running, setRunning] = useState(false)
  const [jobs, setJobs] = useState<MDJob[]>([])
  const [selectedJob, setSelectedJob] = useState<MDJob | null>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(fetchJobs, 3000)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [running])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/md/jobs')
      if (res.ok) {
        const data = await res.json()
        setJobs((data.jobs || []).slice(0, 10))
        const runningJob = (data.jobs || []).find((j: MDJob) => j.status === 'running')
        setRunning(!!runningJob)
        if (selectedJob) {
          const updated = (data.jobs || []).find((j: MDJob) => j.job_id === selectedJob.job_id)
          if (updated) setSelectedJob(updated)
        }
      }
    } catch { /* no-op */ }
  }

  const applyPreset = (idx: number) => {
    setPreset(idx)
    const p = PRESETS[idx]
    setSteps(p.steps)
    setNvtSteps(p.nvt_steps)
    setNptSteps(p.npt_steps)
    setSolventType(p.solvent)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPdbFile(f)
    const text = await f.text()
    setPdbContent(text)
  }

  const runMD = async () => {
    if (!pdbContent) { setError('Upload a PDB file first'); return }
    setError('')
    setRunning(true)
    try {
      const fd = new FormData()
      fd.append('pdb_content', pdbContent)
      fd.append('steps', String(steps))
      fd.append('nvt_steps', String(nvtSteps))
      fd.append('npt_steps', String(nptSteps))
      fd.append('temperature', String(temperature))
      fd.append('pressure', String(pressure))
      fd.append('frame_interval', String(Math.max(100, Math.floor(steps / 100))))
      fd.append('solvent_type', solventType)
      fd.append('force_field', forceField)
      fd.append('name', pdbFile?.name || 'simulation')
      const res = await fetch('/md/dynamics', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) setError(data.error)
      await fetchJobs()
    } catch (e: any) {
      setError(e.message || 'MD simulation failed')
      setRunning(false)
    }
  }

  const cardClass = `rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
  const labelClass = `text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`
  const inputClass = `w-full mt-1 p-2 rounded border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`
  const subtextClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900'

  const r = selectedJob?.result

  return (
    <div className={`h-full overflow-auto p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-1">Molecular Dynamics</h1>
      <p className={`text-sm mb-6 ${subtextClass}`}>OpenMM simulation — NVT → NPT → Production pipeline</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <p className={`text-sm font-semibold mb-3 ${textClass}`}>1. Upload Structure</p>
            <div className="drop-zone" onClick={() => document.getElementById('md-pdb-input')?.click()}>
              <p className="text-sm text-gray-400">{pdbFile ? `✓ ${pdbFile.name}` : 'Drop PDB file or click to browse'}</p>
            </div>
            <input id="md-pdb-input" type="file" accept=".pdb" className="hidden" onChange={handleFileChange} />
          </div>

          <div className={cardClass}>
            <p className={`text-sm font-semibold mb-3 ${textClass}`}>2. Simulation Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => applyPreset(i)}
                  className={`p-2 rounded-lg border text-xs text-left transition-colors ${preset === i ? 'border-blue-500 bg-blue-500/10 text-blue-400' : `${isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'} ${textClass}`}`}>
                  <span className="font-medium block">{p.label}</span>
                  <span className={subtextClass}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <p className={`text-sm font-semibold mb-3 ${textClass}`}>3. Parameters</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Solvent</label>
                <select value={solventType} onChange={e => setSolventType(e.target.value)} className={inputClass}>
                  <option value="implicit">Implicit (GB/NBC) — fast, low RAM</option>
                  <option value="explicit">Explicit TIP3P — 2.5nm box, moderate RAM</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Force Field</label>
                <select value={forceField} onChange={e => setForceField(e.target.value)} className={inputClass}>
                  {FORCE_FIELDS.map(ff => <option key={ff.value} value={ff.value}>{ff.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Temperature (K)</label>
                  <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))} min={200} max={400} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Pressure (bar)</label>
                  <input type="number" value={pressure} onChange={e => setPressure(Number(e.target.value))} min={0.5} max={10} step={0.1} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Production Steps ({steps.toLocaleString()})</label>
                <input type="range" min={1000} max={2000000} step={1000} value={steps} onChange={e => setSteps(Number(e.target.value))} className="w-full mt-1" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1K</span><span>500K</span><span>2M</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>NVT Steps</label>
                  <input type="number" value={nvtSteps} onChange={e => setNvtSteps(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>NPT Steps</label>
                  <input type="number" value={nptSteps} onChange={e => setNptSteps(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <button onClick={runMD} disabled={running || !pdbContent}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {running ? '⏳ Running...' : '▶ Run MD Simulation'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Jobs list + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Running job progress */}
          {jobs.find(j => j.status === 'running') && (
            <div className={`${cardClass} border-blue-500/50`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold text-blue-400`}>🔬 Running: {jobs.find(j => j.status === 'running')?.job_id}</p>
                <span className="text-xs text-blue-400">{jobs.find(j => j.status === 'running')?.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${jobs.find(j => j.status === 'running')?.progress}%` }} />
              </div>
              <p className="text-xs text-gray-400">{jobs.find(j => j.status === 'running')?.message}</p>
            </div>
          )}

          {/* Results */}
          {selectedJob && r && (
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-sm font-semibold ${textClass}`}>{selectedJob.job_id}</p>
                  <p className="text-xs text-gray-400">{r.engine} · {r.platform} · {r.sim_time_ns} ns</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${r.stability === 'stable' ? 'bg-green-900/50 text-green-400' : r.stability === 'borderline' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                    {r.stability}
                  </span>
                  <button onClick={() => setSelectedJob(null)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {[
                  ['Steps', r.n_steps.toLocaleString()],
                  ['NVT', r.nvt_steps?.toLocaleString()],
                  ['NPT', r.npt_steps?.toLocaleString()],
                  ['Temp', `${r.temperature_K} K`],
                  ['Atoms', r.n_atoms?.toLocaleString() || '—'],
                ].map(([k, v]) => (
                  <div key={k} className={`p-2 rounded-lg text-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className={`text-sm font-semibold ${textClass}`}>{v}</p>
                  </div>
                ))}
              </div>

              {r.note && (
                <div className={`p-2 rounded text-xs mb-3 ${isDark ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                  {r.note}
                </div>
              )}

              <MiniPlot data={r.rmsd_angstrom || []} label="RMSD vs initial (Å)" color="#60a5fa" />
              <MiniPlot data={(r.rmsd_angstrom || []).map((_, i, arr) => arr.slice(0, i + 1).reduce((s, v) => s + v, 0) / (i + 1))} label="Running avg energy (kJ/mol)" color="#34d399" />

              <div className="flex gap-2 mt-4">
                {r.final_frame_path && (
                  <a href={`/storage/${r.final_frame_path.split('/').pop()}`} download className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                    Download Final PDB
                  </a>
                )}
                {r.energy_csv_path && (
                  <a href={`/storage/${r.energy_csv_path.split('/').pop()}`} download className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                    Download Energy CSV
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Job history */}
          <div className={cardClass}>
            <p className={`text-sm font-semibold mb-3 ${textClass}`}>Simulation History</p>
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-400">No simulations yet. Upload a PDB and run.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map(j => (
                  <div key={j.job_id} onClick={() => j.status === 'completed' ? setSelectedJob(j) : undefined}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedJob?.job_id === j.job_id ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-blue-400">{j.job_id}</span>
                        {j.result && <span className="ml-2 text-xs text-gray-400">{j.result.sim_time_ns} ns · {j.result.stability}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        j.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        j.status === 'running' ? 'bg-blue-900/50 text-blue-400' :
                        j.status === 'failed' ? 'bg-red-900/50 text-red-400' : 'bg-gray-700 text-gray-400'
                      }`}>{j.status}</span>
                    </div>
                    {j.status === 'running' && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${j.progress}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{j.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
