import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const SAMPLE_COMPOUNDS = [
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
  { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C' },
  { name: 'Metformin', smiles: 'CN(C)C(=N)NC(=N)N' },
]

export function ADMET() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [smiles, setSmiles] = useState('')
  const [smilesList, setSmilesList] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [singleResult, setSingleResult] = useState<any>(null)
  const [batchResults, setBatchResults] = useState<any>(null)
  const [filterResult, setFilterResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'predict' | 'batch' | 'filter'>('predict')

  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm transition-all ${
    isDark
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
  } focus:outline-none focus:ring-2 focus:border-transparent`

  const labelClass = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`

  const cardClass = `rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`

  const handlePredict = async () => {
    if (!smiles.trim()) return
    setLoading(true)
    setError(null)
    setSingleResult(null)
    try {
      const res = await fetch('/admet/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smiles: smiles.trim(),
          predict_absorption: true,
          predict_distribution: true,
          predict_metabolism: true,
          predict_excretion: true,
          predict_toxicity: true,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSingleResult(data)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to predict ADMET')
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    if (!smilesList.trim()) return
    setLoading(true)
    setError(null)
    setBatchResults(null)
    try {
      const smilesArray = smilesList.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/admet/predict/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles_list: smilesArray }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setBatchResults(data)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to batch predict')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    if (!smilesList.trim()) return
    setLoading(true)
    setError(null)
    setFilterResult(null)
    try {
      const smilesArray = smilesList.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/admet/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles_list: smilesArray, filters: ['lipinski', 'veber'] }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setFilterResult(data)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to filter')
    } finally {
      setLoading(false)
    }
  }

  const renderPassFail = (label: string, passed: boolean) => (
    <div className="flex items-center gap-2">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
        passed
          ? isDark ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700'
          : isDark ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-700'
      }`}>
        {passed ? '+' : 'X'}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  )

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">ADMET Prediction</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Predict Absorption, Distribution, Metabolism, Excretion, and Toxicity properties
          </p>
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit overflow-x-auto" style={{ backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }}>
          {([
            { key: 'predict', label: 'Single Predict' },
            { key: 'batch', label: 'Batch Predict' },
            { key: 'filter', label: 'Filter Library' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${
            isDark ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {error}
          </div>
        )}

        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardClass}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Input Molecule</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>SMILES</label>
                  <input
                    type="text"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O"
                    onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
                  />
                </div>

                <div>
                  <label className={labelClass}>Quick Examples</label>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_COMPOUNDS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setSmiles(c.smiles)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          smiles === c.smiles
                            ? 'bg-blue-600 text-white'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePredict}
                  disabled={loading || !smiles.trim()}
                  className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Predicting...' : 'Predict ADMET'}
                </button>
              </div>
            </div>

            {singleResult && (
              <div className="space-y-4">
                <div className={cardClass}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold">Molecular Properties</h2>
                  </div>
                  <div className="p-6">
                    {singleResult.properties && Object.entries(singleResult.properties).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="font-medium font-mono text-sm">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold">Drug-Likeness Rules</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    {singleResult.lipinski !== undefined && renderPassFail("Lipinski's Rule of 5", singleResult.lipinski?.pass ?? singleResult.lipinski)}
                    {singleResult.veber !== undefined && renderPassFail("Veber's Rules", singleResult.veber?.pass ?? singleResult.veber)}
                    {singleResult.drug_likeness !== undefined && renderPassFail('Drug-Likeness', singleResult.drug_likeness)}
                    {singleResult.rule_of_3 !== undefined && renderPassFail('Rule of 3', singleResult.rule_of_3)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Batch ADMET Prediction</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter one SMILES per line
                </p>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  value={smilesList}
                  onChange={(e) => setSmilesList(e.target.value)}
                  className={inputClass + ' min-h-[200px]'}
                  placeholder={"CC(=O)Oc1ccccc1C(=O)O\nCC(C)Cc1ccc(cc1)C(C)C(=O)O\nCn1cnc2c1c(=O)n(C)c(=O)n2C"}
                />
                <button
                  onClick={handleBatch}
                  disabled={loading || !smilesList.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Predicting...' : 'Run Batch Prediction'}
                </button>
              </div>
            </div>

            {batchResults && batchResults.results && (
              <div className={cardClass}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold">Results ({batchResults.total_predicted} compounds)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">SMILES</th>
                        <th className="px-4 py-3 text-right">MW</th>
                        <th className="px-4 py-3 text-right">LogP</th>
                        <th className="px-4 py-3 text-right">TPSA</th>
                        <th className="px-4 py-3 text-center">Lipinski</th>
                        <th className="px-4 py-3 text-center">Drug-like</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResults.results.map((r: any, i: number) => (
                        <tr key={i} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className="px-4 py-3">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate">{r.smiles}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.properties?.molecular_weight?.toFixed(1) || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.properties?.logp?.toFixed(2) || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.properties?.tpsa?.toFixed(1) || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 ${
                              (r.lipinski?.pass ?? r.lipinski) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {(r.lipinski?.pass ?? r.lipinski) ? '+' : 'X'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 ${
                              r.drug_likeness ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {r.drug_likeness ? '+' : 'X'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Filter Compound Library</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Filter compounds by Lipinski and Veber rules
                </p>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  value={smilesList}
                  onChange={(e) => setSmilesList(e.target.value)}
                  className={inputClass + ' min-h-[200px]'}
                  placeholder={"CC(=O)Oc1ccccc1C(=O)O\nCC(C)Cc1ccc(cc1)C(C)C(=O)O\nCn1cnc2c1c(=O)n(C)c(=O)n2C"}
                />
                <button
                  onClick={handleFilter}
                  disabled={loading || !smilesList.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Filtering...' : 'Filter by Drug-Likeness'}
                </button>
              </div>
            </div>

            {filterResult && (
              <div className={cardClass}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Filter Results</h2>
                    <div className="flex gap-3 text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        Input: {filterResult.total_input}
                      </span>
                      <span className="text-green-500 font-medium">
                        Passed: {filterResult.passed}
                      </span>
                      <span className="text-red-500 font-medium">
                        Failed: {filterResult.failed}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                        <th className="px-4 py-3 text-left">SMILES</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-left">Violations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterResult.results?.map((r: any, i: number) => (
                        <tr key={i} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className="px-4 py-3 font-mono text-xs max-w-[300px] truncate">{r.smiles}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.passed
                                ? isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                                : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'
                            }`}>
                              {r.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {r.violations?.join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
