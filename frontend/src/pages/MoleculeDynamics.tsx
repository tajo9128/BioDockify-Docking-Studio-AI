import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Tabs, TabPanel } from '@/components/ui'
import Plot from 'react-plotly.js'
import {
  runDynamics,
  runEquilibration,
  calculateMMGBSA,
  getMDGPUStatus as getGPUStatus,
  getMDJobStatus,
  analyzeRMSD,
  analyzeRMSF,
  analyzeEnergy,
  analyzeGyration,
  analyzeSASA,
  analyzeHBonds,
  runFullAnalysis,
  createPublication,
  getNotifyStatus,
  testNotification,
  type MDDynamicsRequest,
  type MDJobResponse,
  type MDJobStatus,
  type MDAnalysisResult,
} from '@/api/md'

const SAMPLE_PDB = `ATOM      1  N   GLY A   1      11.281  29.877   6.959  1.00 23.73           N
ATOM      2  CA  GLY A   1      10.296  28.809   6.650  1.00 22.37           C
ATOM      3  C   GLY A   1       9.125  29.342   5.855  1.00 20.92           C
ATOM      4  O   GLY A   1       8.032  28.803   5.928  1.00 19.80           O
ATOM      5  N   ALA A   2       9.359  30.453   5.108  1.00 18.71           N
ATOM      6  CA  ALA A   2       8.283  31.063   4.352  1.00 17.21           C
ATOM      7  C   ALA A   2       7.469  31.996   5.234  1.00 16.05           C
ATOM      8  O   ALA A   2       6.250  32.121   5.107  1.00 16.83           O
ATOM      9  N   LEU A   3       8.123  32.646   6.191  1.00 15.44           N
ATOM     10  CA  LEU A   3       7.332  33.582   7.010  1.00 14.73           C
ATOM     11  C   LEU A   3       7.350  34.983   6.391  1.00 14.50           C
ATOM     12  O   LEU A   3       8.404  35.604   6.261  1.00 15.24           O
ATOM     13  N   GLU A   4       6.151  35.484   5.992  1.00 14.01           N
ATOM     14  CA  GLU A   4       6.067  36.830   5.413  1.00 13.89           C
ATOM     15  C   GLU A   4       5.039  36.864   4.292  1.00 13.25           C
ATOM     16  O   GLU A   4       4.298  35.899   4.059  1.00 13.52           O
ATOM     17  N   LYS A   5       4.963  37.996   3.589  1.00 12.44           N
ATOM     18  CA  LYS A   5       3.993  38.166   2.497  1.00 12.33           C
ATOM     19  C   LYS A   5       4.552  37.803   1.131  1.00 12.01           C
ATOM     20  O   LYS A   5       5.759  37.546   1.009  1.00 12.76           O
END`

const TABS = [
  { id: 'setup', label: '⚙️ Setup' },
  { id: 'monitor', label: '📡 Monitor' },
  { id: 'analysis', label: '📊 Analysis' },
]

const SOLVENT_MODELS = ['tip3p', 'spce', 'tip4pew']

export function MoleculeDynamics() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('setup')
  const [pdbContent, setPdbContent] = useState('')
  const [steps, setSteps] = useState(50000)
  const [temperature, setTemperature] = useState(300)
  const [frameInterval, setFrameInterval] = useState(500)
  const [solventModel, setSolventModel] = useState('tip3p')
  const [ionicStrength, setIonicStrength] = useState(0.0)
  const [simName, setSimName] = useState('my_simulation')
  const [notifyOnStart, setNotifyOnStart] = useState(false)
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const [notifyStatus, setNotifyStatus] = useState<Record<string, boolean>>({ telegram: false, discord: false, slack: false, email: false })

  const [runLoading, setRunLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<MDJobStatus | null>(null)

  const [analysisResults, setAnalysisResults] = useState<Record<string, MDAnalysisResult>>({})
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [pubLoading, setPubLoading] = useState(false)
  const [gpuStatus, setGpuStatus] = useState<any>(null)
  const [, setEquilJobId] = useState<string | null>(null)
  const [equilResult, _setEquilResult] = useState<any>(null)
  const [mmgbsaResult, setMmgbsaResult] = useState<any>(null)
  const [mmgbsaLoading, setMmgbsaLoading] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadNotifyStatus()
    loadGPUStatus()
  }, [])

  async function loadGPUStatus() {
    try {
      const status = await getGPUStatus()
      setGpuStatus(status)
    } catch (e) {
      console.warn('Could not load GPU status')
    }
  }

  useEffect(() => {
    if (currentJobId && jobStatus?.status === 'running') {
      pollingRef.current = setInterval(checkJobStatus, 3000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [currentJobId, jobStatus?.status])

  async function loadNotifyStatus() {
    try {
      const status = await getNotifyStatus()
      setNotifyStatus({ ...status } as Record<string, boolean>)
    } catch (e) {
      console.warn('Could not load notification status')
    }
  }

  async function checkJobStatus() {
    if (!currentJobId) return
    try {
      const status = await getMDJobStatus(currentJobId)
      setJobStatus(status)
      if (status.status === 'completed' || status.status === 'failed') {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    } catch (e) {
      console.warn('Status poll failed')
    }
  }

  async function handleRunDynamics() {
    if (!pdbContent.trim()) {
      setRunError('Please enter PDB content')
      return
    }
    setRunError(null)
    setRunLoading(true)
    setAnalysisResults({})
    try {
      const request: MDDynamicsRequest = {
        pdb_content: pdbContent,
        steps,
        temperature,
        pressure: 1.0,
        frame_interval: frameInterval,
        solvent_model: solventModel,
        ionic_strength: ionicStrength,
        name: simName,
        notify_on_start: notifyOnStart,
        notify_on_complete: notifyOnComplete,
      }
      const response: MDJobResponse = await runDynamics(request)
      setCurrentJobId(response.job_id)
      setJobStatus({ status: 'pending', progress: 0, message: 'Queued', updated_at: new Date().toISOString() })
      setActiveTab('monitor')
    } catch (err: any) {
      setRunError(err?.response?.data?.detail || err?.message || 'Failed to start dynamics')
    } finally {
      setRunLoading(false)
    }
  }

  async function handleRunAnalysis(analysisType: string) {
    if (!currentJobId) {
      setAnalysisError('No completed job to analyze')
      return
    }
    setAnalysisError(null)
    setAnalysisLoading(analysisType)
    try {
      const request = { job_id: currentJobId }
      let result: MDAnalysisResult
      switch (analysisType) {
        case 'rmsd': result = await analyzeRMSD(request); break
        case 'rmsf': result = await analyzeRMSF(request); break
        case 'energy': result = await analyzeEnergy(request); break
        case 'gyration': result = await analyzeGyration(request); break
        case 'sasa': result = await analyzeSASA(request); break
        case 'hbonds': result = await analyzeHBonds(request); break
        default: throw new Error('Unknown analysis type')
      }
      setAnalysisResults(prev => ({ ...prev, [analysisType]: result }))
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || `Analysis failed: ${analysisType}`)
    } finally {
      setAnalysisLoading(null)
    }
  }

  async function handleRunAllAnalysis() {
    if (!currentJobId) return
    setAnalysisError(null)
    setAnalysisLoading('all')
    try {
      const response = await runFullAnalysis({ job_id: currentJobId })
      setCurrentJobId(response.job_id)
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'Full analysis failed')
    } finally {
      setAnalysisLoading(null)
    }
  }

  async function handleCreatePublication() {
    if (!currentJobId) return
    setPubLoading(true)
    try {
      await createPublication({
        job_id: currentJobId,
        project_name: simName,
        compress: true,
        notify_on_complete: false,
      })
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'Publication packaging failed')
    } finally {
      setPubLoading(false)
    }
  }

  async function handleTestNotify(channel: string) {
    try {
      await testNotification(channel)
    } catch (e) {
      console.warn(`Test notification failed for ${channel}`)
    }
  }

  async function handleRunEquilibration() {
    if (!pdbContent.trim()) {
      setRunError('Please enter PDB content')
      return
    }
    setRunError(null)
    setRunLoading(true)
    try {
      const response = await runEquilibration({
        pdb_content: pdbContent,
        temperature,
        pressure: 1.0,
        solvent_model: solventModel,
        ionic_strength: 0.15,
        name: simName + '_equil',
      })
      setEquilJobId(response.job_id)
      setActiveTab('monitor')
    } catch (err: any) {
      setRunError(err?.response?.data?.detail || err?.message || 'Failed to start equilibration')
    } finally {
      setRunLoading(false)
    }
  }

  async function handleRunMMGBSA() {
    if (!jobStatus?.result?.trajectory_path) {
      setAnalysisError('No completed trajectory to analyze')
      return
    }
    setMmgbsaLoading(true)
    setAnalysisError(null)
    try {
      const result = await calculateMMGBSA({
        trajectory_path: jobStatus.result.trajectory_path,
        receptor_pdb: pdbContent,
        ligand_pdb: '',
      })
      setMmgbsaResult(result)
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'MM-GBSA failed')
    } finally {
      setMmgbsaLoading(false)
    }
  }

  function renderPlotly(data: any, layout: any) {
    try {
      return <Plot data={data} layout={{ ...layout, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }} config={{ displayModeBar: false }} style={{ width: '100%', height: 300 }} />
    } catch (e) {
      return <div className="h-[300px] bg-gray-800 rounded flex items-center justify-center text-gray-500">Chart unavailable</div>
    }
  }

  function progressColor(pct: number) {
    if (pct < 30) return 'bg-red-500'
    if (pct < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Dynamics</h1>
        <p className="text-text-secondary mt-1">OpenMM MD simulation with real-time monitoring</p>
        {gpuStatus && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${gpuStatus.gpu_available ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-text-tertiary">
              {gpuStatus.gpu_available
                ? `GPU: ${gpuStatus.recommended_platform}`
                : `CPU mode (${gpuStatus.all_platforms?.join(', ') || 'Reference'})`}
            </span>
          </div>
        )}
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel>
        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Simulation Setup</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">PDB Structure</label>
                  <textarea
                    value={pdbContent}
                    onChange={(e) => setPdbContent(e.target.value)}
                    placeholder="Paste PDB content or use sample..."
                    rows={8}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-xs font-mono"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button variant="secondary" onClick={() => setPdbContent(SAMPLE_PDB)} className="text-xs">
                      Load Sample (Gly-Ala-Leu-Glu-Lys)
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Simulation Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Steps ({steps.toLocaleString()} = {(steps * 0.002 / 1000).toFixed(2)}ns)</label>
                    <input
                      type="range"
                      min={5000}
                      max={500000}
                      step={5000}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10ps</span>
                      <span>1ns</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Temperature (K): {temperature}</label>
                    <input
                      type="range"
                      min={100}
                      max={500}
                      step={10}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Solvent Model</label>
                    <select
                      value={solventModel}
                      onChange={(e) => setSolventModel(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {SOLVENT_MODELS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Ionic Strength (M): {ionicStrength}</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={ionicStrength}
                      onChange={(e) => setIonicStrength(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Frame Interval: {frameInterval} steps</label>
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={100}
                    value={frameInterval}
                    onChange={(e) => setFrameInterval(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notifications</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOnStart}
                        onChange={(e) => setNotifyOnStart(e.target.checked)}
                        className="rounded"
                      />
                      Notify on start
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOnComplete}
                        onChange={(e) => setNotifyOnComplete(e.target.checked)}
                        className="rounded"
                      />
                      Notify on completion
                    </label>
                    <div className="flex gap-2 mt-2">
                      {Object.entries(notifyStatus).filter(([k]) => notifyStatus[k]).map(([channel]) => (
                        <button
                          key={channel}
                          onClick={() => handleTestNotify(channel)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 capitalize"
                        >
                          Test {channel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {runError && (
                  <div className="p-3 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm">
                    {runError}
                  </div>
                )}

                <Button
                  onClick={handleRunDynamics}
                  disabled={runLoading || !pdbContent.trim()}
                  className="w-full"
                >
                  {runLoading ? 'Starting...' : '▶ Start Dynamics'}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleRunEquilibration}
                    disabled={runLoading || !pdbContent.trim()}
                    variant="secondary"
                    className="text-xs"
                  >
                    ⚖️ Run Equilibration
                  </Button>
                  <Button
                    onClick={handleRunMMGBSA}
                    disabled={mmgbsaLoading || !jobStatus?.result?.trajectory_path}
                    variant="secondary"
                    className="text-xs"
                  >
                    {mmgbsaLoading ? 'Computing...' : '🔬 MM-GBSA'}
                  </Button>
                </div>

                {equilResult && (
                  <div className="p-3 rounded bg-green-900/50 border border-green-700 text-green-300 text-xs space-y-1">
                    <p className="font-semibold">✓ Equilibration Complete</p>
                    <p>Minimization: {equilResult.minimization_energy_kj_mol} kJ/mol</p>
                    <p>NVT: {equilResult.nvt_energy_kj_mol} kJ/mol</p>
                    <p>NPT: {equilResult.npt_energy_kj_mol} kJ/mol</p>
                    <p>Atoms: {equilResult.n_atoms}</p>
                  </div>
                )}

                {mmgbsaResult && mmgbsaResult.success && (
                  <div className="p-3 rounded bg-purple-900/50 border border-purple-700 text-purple-300 text-xs space-y-1">
                    <p className="font-semibold">✓ MM-GBSA Results</p>
                    <p>Mean Binding Energy: {mmgbsaResult.mean_binding_energy_kj_mol} kJ/mol</p>
                    <p>Std Dev: {mmgbsaResult.std_binding_energy_kj_mol} kJ/mol</p>
                    <p>Frames Analyzed: {mmgbsaResult.n_frames_analyzed}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-text-primary mb-4">Engine Info</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-xs text-gray-400">Engine</p>
                    <p className="text-lg font-bold text-white">OpenMM</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-xs text-gray-400">Platform</p>
                    <p className="text-lg font-bold text-white">{gpuStatus?.recommended_platform || 'Auto'}</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-xs text-gray-400">Ensemble</p>
                    <p className="text-lg font-bold text-white">NPT</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-xs text-gray-400">Timestep</p>
                    <p className="text-lg font-bold text-white">2fs</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <p className="text-xs text-gray-400 mb-2">MD-Suite Modules</p>
                  <div className="flex flex-wrap gap-1">
                    {['RMSD', 'RMSF', 'Energy', 'Gyration', 'SASA', 'H-bonds', 'Publication', 'Notifications'].map(m => (
                      <span key={m} className="px-2 py-0.5 text-xs bg-gray-700 rounded text-gray-300">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <p className="text-xs text-gray-400 mb-2">Notification Channels</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(notifyStatus).map(([ch, enabled]) => (
                      <span key={ch} className={`px-2 py-0.5 text-xs rounded capitalize ${enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-500'}`}>
                        {ch}: {enabled ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Job Status</h3>
              {!currentJobId ? (
                <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                  No simulation running. Go to Setup to start.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Job ID</p>
                      <p className="text-sm font-mono text-white">{currentJobId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      jobStatus?.status === 'completed' ? 'bg-green-900 text-green-300' :
                      jobStatus?.status === 'failed' ? 'bg-red-900 text-red-300' :
                      jobStatus?.status === 'running' ? 'bg-blue-900 text-blue-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {jobStatus?.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>

                  {jobStatus?.status === 'running' && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>{jobStatus.message}</span>
                        <span>{jobStatus.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${progressColor(jobStatus.progress || 0)}`}
                          style={{ width: `${jobStatus.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {jobStatus?.status === 'completed' && jobStatus.result && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-400">Simulated Time</p>
                          <p className="text-xl font-bold text-green-400">{jobStatus.result.sim_time_ns.toFixed(2)} ns</p>
                        </div>
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-400">Frames</p>
                          <p className="text-xl font-bold text-white">{jobStatus.result.n_frames}</p>
                        </div>
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-400">Temperature</p>
                          <p className="text-xl font-bold text-white">{jobStatus.result.temperature_K} K</p>
                        </div>
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-400">Avg Energy</p>
                          <p className="text-xl font-bold text-orange-400">{jobStatus.result.avg_energy_kj_mol.toFixed(1)} kJ/mol</p>
                        </div>
                      </div>
                      <Button onClick={() => setActiveTab('analysis')} className="w-full">
                        Go to Analysis
                      </Button>
                      {(jobStatus.result as any).trajectory_path && (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => {
                            const result = jobStatus.result as any
                            navigate(`/viewer?trajectory=${encodeURIComponent(result.trajectory_path || '')}&topology=${encodeURIComponent(result.final_frame_path || '')}`)
                          }}
                        >
                          🎬 View Trajectory
                        </Button>
                      )}
                    </div>
                  )}

                  {jobStatus?.status === 'failed' && (
                    <div className="p-3 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm">
                      {jobStatus.error || 'Simulation failed'}
                    </div>
                  )}

                  {jobStatus?.status === 'pending' && (
                    <div className="flex items-center justify-center h-20">
                      <span className="animate-pulse text-2xl">⏳</span>
                      <span className="ml-2 text-gray-400">Job queued...</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-bold text-text-primary mb-4">Energy Preview</h3>
              {analysisResults.energy ? (
                analysisResults.energy.plot_data ? renderPlotly(analysisResults.energy.plot_data.data, analysisResults.energy.plot_data.layout) :
                <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                  Energy: {analysisResults.energy.mean_energy_kj_mol?.toFixed(2)} kJ/mol
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                  Run energy analysis after simulation completes
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary">Analysis Suite</h3>
                {currentJobId && <p className="text-xs text-gray-400 mt-1">Job: {currentJobId}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleRunAllAnalysis}
                  disabled={!currentJobId || analysisLoading === 'all'}
                >
                  {analysisLoading === 'all' ? 'Running...' : '▶ Run All'}
                </Button>
                <Button
                  onClick={handleCreatePublication}
                  disabled={!currentJobId || pubLoading}
                >
                  {pubLoading ? 'Packaging...' : '📦 Publication Package'}
                </Button>
              </div>
            </div>

            {analysisError && (
              <div className="p-3 rounded bg-red-900/50 border border-red-700 text-red-300 text-sm">
                {analysisError}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'rmsd', label: 'RMSD', desc: 'Root Mean Square Deviation', color: 'steelblue' },
                { key: 'rmsf', label: 'RMSF', desc: 'Per-residue fluctuation', color: 'crimson' },
                { key: 'energy', label: 'Energy', desc: 'Potential energy trajectory', color: 'orange' },
                { key: 'gyration', label: 'Rg', desc: 'Radius of gyration', color: 'green' },
                { key: 'sasa', label: 'SASA', desc: 'Solvent accessible surface', color: 'purple' },
                { key: 'hbonds', label: 'H-bonds', desc: 'Hydrogen bond count', color: 'deepskyblue' },
              ].map(({ key, label, desc }) => (
                <Card key={key}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-text-primary">{label}</h4>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    {analysisResults[key] && (
                      <span className="px-2 py-0.5 text-xs bg-green-900 text-green-300 rounded">Done</span>
                    )}
                  </div>

                  {analysisResults[key] ? (
                    <div className="space-y-2">
                      {analysisResults[key].plot_data ? (
                        renderPlotly(analysisResults[key].plot_data.data, analysisResults[key].plot_data.layout)
                      ) : (
                        <div className="h-[150px] flex items-center justify-center text-xs text-gray-400">
                          Stats available — no chart
                        </div>
                      )}
                      {analysisResults[key].mean_rmsd_nm !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_rmsd_nm.toFixed(3)} nm</p>
                      )}
                      {analysisResults[key].mean_rmsf_nm !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_rmsf_nm.toFixed(3)} nm</p>
                      )}
                      {analysisResults[key].mean_energy_kj_mol !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_energy_kj_mol.toFixed(2)} kJ/mol</p>
                      )}
                      {analysisResults[key].mean_rg_nm !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_rg_nm.toFixed(3)} nm</p>
                      )}
                      {analysisResults[key].mean_sasa_nm2 !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_sasa_nm2.toFixed(2)} nm²</p>
                      )}
                      {analysisResults[key].mean_hbonds !== undefined && (
                        <p className="text-xs text-gray-400">Mean: {analysisResults[key].mean_hbonds} H-bonds</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => handleRunAnalysis(key)}
                      disabled={!currentJobId || analysisLoading !== null}
                      className="w-full mt-2"
                    >
                      {analysisLoading === key ? 'Running...' : `Run ${label}`}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
