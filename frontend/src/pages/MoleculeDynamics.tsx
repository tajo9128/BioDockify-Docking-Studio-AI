import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export function MoleculeDynamics() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [pdbFile, setPdbFile] = useState<File | null>(null)
  const [steps, setSteps] = useState(500)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const runMD = async () => {
    if (!pdbFile) return
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('pdb_file', pdbFile)
      fd.append('steps', String(steps))
      const res = await fetch('/md', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e: any) {
      setError(e.message || 'MD simulation failed')
    }
    setRunning(false)
  }

  return (
    <div className={`h-full p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-6">Molecular Dynamics</h1>
      <div className={`max-w-xl p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Run a short OpenMM molecular dynamics simulation (vacuum minimization + Langevin dynamics).
        </p>
        <div className="space-y-4">
          <div>
            <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>PDB File</label>
            <input
              type="file"
              accept=".pdb"
              onChange={e => setPdbFile(e.target.files?.[0] || null)}
              className={`w-full mt-1 p-2 rounded border text-sm ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Steps</label>
            <input
              type="number"
              value={steps}
              onChange={e => setSteps(Number(e.target.value))}
              className={`w-full mt-1 p-2 rounded border text-sm ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <button
            onClick={runMD}
            disabled={running || !pdbFile}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run MD Simulation'}
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        {result && (
          <div className={`mt-4 p-4 rounded text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p><strong>Job ID:</strong> {result.job_id}</p>
            <p><strong>Steps:</strong> {result.steps_run}</p>
            <p><strong>Final Energy:</strong> {result.energy_kcal?.[result.energy_kcal?.length - 1]?.toFixed(2)} kcal/mol</p>
            {result.final_pdb && (
              <a href={result.final_pdb} download className="mt-2 inline-block text-blue-500 hover:underline">
                Download Final Structure
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
