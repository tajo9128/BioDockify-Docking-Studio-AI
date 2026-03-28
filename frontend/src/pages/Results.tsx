import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Tabs, TabPanel, Badge, DataTable, Button } from '@/components/ui'
import { useJob, useJobResults, useJobInteractions } from '@/hooks/useJobs'
import { jsPDF } from 'jspdf'

export function Results() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('summary')
  const [selectedPose, setSelectedPose] = useState<number>(1)

  const jobUuid = searchParams.get('job')

  const { data: job, isLoading: jobLoading } = useJob(jobUuid)
  const { data: resultsData } = useJobResults(jobUuid)
  const { data: interactionsData } = useJobInteractions(jobUuid, selectedPose)

  const results = resultsData?.results || []
  const interactions = interactionsData?.interactions || []

  const bestResult = results.length > 0 
    ? results.reduce((best, r) => {
        const bestScore = best.vina_score || 0
        const rScore = r.vina_score || 0
        return rScore < bestScore ? r : best
      })
    : null

  const tabs = [
    { id: 'summary', label: '📋 Summary' },
    { id: 'interactions', label: '🔗 Interactions' },
    { id: 'poses', label: '🧬 Poses' },
    { id: 'export', label: '📥 Export' },
  ]

  const resultColumns = [
    { key: 'pose_id', label: 'Pose' },
    { key: 'vina_score', label: 'Vina Score' },
    { key: 'gnina_score', label: 'CNN Score' },
    { key: 'rf_score', label: 'RF Score' },
    { key: 'consensus', label: 'Consensus' },
  ]

  const interactionTypeColors: Record<string, string> = {
    'hbond': 'success',
    'hydrophobic': 'warning',
    'pi_stacking': 'info',
    'salt_bridge': 'error',
    'van_der_waals': 'default',
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Docking Results</h1>
          <p className="text-text-secondary mt-1">
            {job ? `Job: ${job.job_name}` : 'Analyze binding poses and interactions'}
          </p>
        </div>
        {job && (
          <Badge variant={job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'error' : 'info'}>
            {job.status}
          </Badge>
        )}
      </div>

      {!jobUuid ? (
        <Card>
          <div className="text-center py-12 text-text-tertiary">
            <p>No job selected</p>
            <p className="text-xs mt-1">Select a completed job from the Job Queue to view results</p>
            <Button className="mt-4" onClick={() => navigate('/jobs')}>
              Go to Job Queue
            </Button>
          </div>
        </Card>
      ) : jobLoading ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-text-secondary">Loading results...</p>
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-text-tertiary">
            <p>No results available for this job</p>
            <p className="text-xs mt-1">The job may still be running or failed</p>
          </div>
        </Card>
      ) : (
        <div>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <TabPanel>
            {activeTab === 'summary' && (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <p className="text-sm text-text-secondary mb-1">Best Vina Score</p>
                    <p className="text-3xl font-bold text-primary">
                      {bestResult?.vina_score?.toFixed(2) || 'N/A'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">kcal/mol</p>
                  </Card>
                  <Card className="bg-gradient-to-br from-success/10 to-success/5">
                    <p className="text-sm text-text-secondary mb-1">CNN Score</p>
                    <p className="text-3xl font-bold text-success">
                      {bestResult?.gnina_score?.toFixed(3) || 'N/A'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">Deep Learning</p>
                  </Card>
                  <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
                    <p className="text-sm text-text-secondary mb-1">RF Score</p>
                    <p className="text-3xl font-bold text-secondary">
                      {bestResult?.rf_score?.toFixed(3) || 'N/A'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">Machine Learning</p>
                  </Card>
                  <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
                    <p className="text-sm text-text-secondary mb-1">Consensus</p>
                    <p className="text-3xl font-bold text-warning">
                      {bestResult?.consensus?.toFixed(2) || 'N/A'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">Combined</p>
                  </Card>
                </div>
                <Card>
                  <h3 className="font-bold text-text-primary mb-4">Job Details</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-text-tertiary">Engine</p>
                      <p className="font-medium">{job?.engine || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">Created</p>
                      <p className="font-medium">{job?.created_at ? new Date(job.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">Completed</p>
                      <p className="font-medium">{job?.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">Total Poses</p>
                      <p className="font-medium">{results.length}</p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <h3 className="font-bold text-text-primary mb-4">Top Poses</h3>
                  <div className="space-y-2">
                    {results.slice(0, 5).map((result) => (
                      <div
                        key={result.pose_id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPose === result.pose_id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border-light hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedPose(result.pose_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={selectedPose === result.pose_id ? 'success' : 'default'}>
                            Pose {result.pose_id}
                          </Badge>
                          <span className="text-sm text-text-secondary">
                            {result.ligand_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span>
                            <span className="text-text-tertiary">Vina: </span>
                            <span className="font-medium">{result.vina_score?.toFixed(2) || 'N/A'}</span>
                          </span>
                          <span>
                            <span className="text-text-tertiary">CNN: </span>
                            <span className="font-medium">{result.gnina_score?.toFixed(3) || 'N/A'}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            {activeTab === 'interactions' && (
              <Card className="mt-6">
                <h3 className="font-bold text-text-primary mb-4">Interactions for Pose {selectedPose}</h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {results.map((r) => (
                    <button
                      key={r.pose_id}
                      onClick={() => setSelectedPose(r.pose_id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedPose === r.pose_id
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-primary/10'
                      }`}
                    >
                      Pose {r.pose_id}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">
                      {interactions.filter(i => i.interaction_type === 'hbond').length}
                    </p>
                    <p className="text-xs text-text-secondary">Hydrogen Bonds</p>
                  </div>
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <p className="text-2xl font-bold text-warning">
                      {interactions.filter(i => i.interaction_type === 'hydrophobic').length}
                    </p>
                    <p className="text-xs text-text-secondary">Hydrophobic</p>
                  </div>
                  <div className="p-3 bg-info/10 rounded-lg">
                    <p className="text-2xl font-bold text-info">
                      {interactions.filter(i => i.interaction_type === 'pi_stacking').length}
                    </p>
                    <p className="text-xs text-text-secondary">Pi Stacking</p>
                  </div>
                  <div className="p-3 bg-error/10 rounded-lg">
                    <p className="text-2xl font-bold text-error">
                      {interactions.filter(i => i.interaction_type === 'salt_bridge').length}
                    </p>
                    <p className="text-xs text-text-secondary">Salt Bridges</p>
                  </div>
                </div>
                {interactions.length > 0 ? (
                  <div className="space-y-2">
                    {interactions.map((interaction, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={(interactionTypeColors[interaction.interaction_type] as any) || 'default'}>
                            {interaction.interaction_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-mono">
                            {interaction.atom_a} / {interaction.atom_b}
                          </span>
                        </div>
                        <span className="text-sm text-text-secondary">
                          {interaction.distance.toFixed(2)} A
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-tertiary">
                    <p>No interactions found</p>
                  </div>
                )}
              </Card>
            )}
            {activeTab === 'poses' && (
              <Card className="mt-6">
                <h3 className="font-bold text-text-primary mb-4">All Poses</h3>
                <DataTable
                  columns={resultColumns}
                  data={results}
                  onRowClick={(row) => setSelectedPose(row.pose_id)}
                  emptyMessage="No poses available"
                />
              </Card>
            )}
            {activeTab === 'export' && (
              <Card className="mt-6">
                <h3 className="font-bold text-text-primary mb-4">Export Results</h3>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <Button variant="outline" onClick={() => {
                    const csv = ['pose_id,vina_score,gnina_score,rf_score,consensus',
                      ...results.map(r => `${r.pose_id},${r.vina_score || ''},${r.gnina_score || ''},${r.rf_score || ''},${r.consensus || ''}`)
                    ].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `docking_results_${jobUuid}.csv`
                    a.click()
                  }}>
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => {
                    const json = JSON.stringify({ job, results }, null, 2)
                    const blob = new Blob([json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `docking_results_${jobUuid}.json`
                    a.click()
                  }}>
                    JSON
                  </Button>
                  <Button variant="outline" onClick={() => {
                    const text = [`Docking Results - ${job?.job_name}`,
                      `Best: ${bestResult?.vina_score?.toFixed(2) || 'N/A'} kcal/mol`,
                      ...results.map(r => `Pose ${r.pose_id}: ${r.vina_score?.toFixed(2) || 'N/A'}`)
                    ].join('\n')
                    const blob = new Blob([text], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `docking_results_${jobUuid}.txt`
                    a.click()
                  }}>
                    Text
                  </Button>
                  <Button variant="primary" onClick={() => {
                    const doc = new jsPDF()
                    doc.setFontSize(20)
                    doc.text('Docking Results', 20, 20)
                    doc.setFontSize(12)
                    doc.text(`Job: ${job?.job_name || 'Unknown'}`, 20, 35)
                    doc.text(`Best Score: ${bestResult?.vina_score?.toFixed(2) || 'N/A'} kcal/mol`, 20, 45)
                    let y = 60
                    results.forEach((r, _idx) => {
                      doc.text(`Pose ${r.pose_id}: ${r.vina_score?.toFixed(2) || 'N/A'} kcal/mol`, 20, y)
                      y += 10
                    })
                    doc.save(`docking_report_${jobUuid}.pdf`)
                  }}>
                    PDF Report
                  </Button>
                </div>
              </Card>
            )}
          </TabPanel>
        </div>
      )}
    </div>
  )
}
