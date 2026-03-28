import { useState } from 'react'
import { Card, Button, Badge, Tabs, TabPanel } from '@/components/ui'
import { PharmacophoreViewer3D, FEATURE_INFO } from '@/components/PharmacophoreViewer'
import { Molecule2DViewer } from '@/components/Molecule2DViewer'
import { 
  generatePharmacophore, 
  screenLibrary, 
  alignMolecule,
  SAMPLE_SMILES,
  SAMPLE_LIBRARY,
  type PharmacophoreFeature
} from '@/api/pharmacophore'

type ViewMode = 'generate' | 'screen' | 'align'

const VIEW_MODES = [
  { id: 'generate', label: '🔬 Generate' },
  { id: 'screen', label: '📋 Screen Library' },
  { id: 'align', label: '🔗 Align' },
]

export function Pharmacophore() {
  const [activeMode, setActiveMode] = useState<ViewMode>('generate')
  const [smiles, setSmiles] = useState(SAMPLE_SMILES.aspirin)
  const [features, setFeatures] = useState<PharmacophoreFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Screening state
  const [library] = useState<string[]>(SAMPLE_LIBRARY)
  const [screeningResults, setScreeningResults] = useState<any>(null)
  const [minFeatures, setMinFeatures] = useState(3)
  
  // Alignment state
  const [refSmiles, setRefSmiles] = useState(SAMPLE_SMILES.caffeine)
  const [mobileSmiles, setMobileSmiles] = useState(SAMPLE_SMILES.ibuprofen)
  const [alignmentResult, setAlignmentResult] = useState<any>(null)

  const handleGenerate = async () => {
    if (!smiles) return
    setLoading(true)
    setError(null)
    
    try {
      const result = await generatePharmacophore(smiles)
      if (result.success) {
        setFeatures(result.features)
      } else {
        setError(result.error || 'Failed to generate pharmacophore')
      }
    } catch (e: any) {
      setError(e.message || 'Error generating pharmacophore')
    } finally {
      setLoading(false)
    }
  }

  const handleScreen = async () => {
    if (!features.length || !library.length) return
    setLoading(true)
    
    try {
      const result = await screenLibrary(library, minFeatures)
      setScreeningResults(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAlign = async () => {
    if (!refSmiles || !mobileSmiles) return
    setLoading(true)
    
    try {
      // First generate reference pharmacophore
      const refResult = await generatePharmacophore(refSmiles)
      if (!refResult.success) {
        setError(refResult.error || 'Failed to generate reference pharmacophore')
        return
      }
      
      // Then align
      const result = await alignMolecule(refResult.features, mobileSmiles)
      setAlignmentResult(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sampleKey: keyof typeof SAMPLE_SMILES) => {
    setSmiles(SAMPLE_SMILES[sampleKey])
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Pharmacophore Modeling</h1>
        <p className="text-text-secondary mt-1">
          Discovery Studio-like pharmacophore generation and virtual screening
        </p>
      </div>

      {/* Feature Legend */}
      <Card className="mb-6">
        <h3 className="font-bold text-text-primary mb-3">Pharmacophore Features</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {FEATURE_INFO.map((feat) => (
            <div key={feat.name} className="flex items-center gap-2 p-2 rounded-lg bg-surface-secondary">
              <span 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: feat.color }}
              />
              <div>
                <p className="text-sm font-medium">{feat.name}</p>
                <p className="text-xs text-text-tertiary">{feat.description.substring(0, 30)}...</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mode Tabs */}
      <Tabs 
        tabs={VIEW_MODES} 
        activeTab={activeMode} 
        onChange={(id) => setActiveMode(id as ViewMode)} 
      />

      <TabPanel className="mt-6">
        {activeMode === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Generate Pharmacophore</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMILES Input</label>
                  <textarea
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    className="w-full p-2 border border-border-light rounded-lg bg-surface-secondary text-sm font-mono"
                    rows={3}
                    placeholder="Enter SMILES notation..."
                  />
                </div>
                
                {/* Sample Molecules */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sample Molecules</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(SAMPLE_SMILES).map((key) => (
                      <button
                        key={key}
                        onClick={() => loadSample(key as keyof typeof SAMPLE_SMILES)}
                        className="px-2 py-1 text-xs rounded bg-surface-secondary hover:bg-primary/10 text-text-secondary"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button onClick={handleGenerate} disabled={!smiles || loading}>
                  {loading ? 'Generating...' : '🔬 Generate Pharmacophore'}
                </Button>
                
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}
              </div>
            </Card>

            {/* Results */}
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Pharmacophore Visualization</h3>
              
              {features.length > 0 ? (
                <div className="space-y-4">
                  {/* 3D Viewer */}
                  <PharmacophoreViewer3D 
                    features={features} 
                    smiles={smiles}
                    width={400}
                    height={300}
                  />
                  
                  {/* 2D Structure */}
                  <Molecule2DViewer smiles={smiles} width={200} height={150} />
                  
                  {/* Feature Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(
                      features.reduce((acc, f) => {
                        acc[f.family] = (acc[f.family] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => {
                      const feat = FEATURE_INFO.find(f => f.name === type)
                      return (
                        <div key={type} className="p-2 bg-surface-secondary rounded text-center">
                          <p className="text-lg font-bold" style={{ color: feat?.color }}>
                            {count}
                          </p>
                          <p className="text-xs text-text-secondary">{type}</p>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Feature List */}
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs p-1 bg-surface-secondary rounded">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: feat.color }}
                        />
                        <span className="font-medium">{feat.family}</span>
                        <span className="text-text-tertiary">
                          ({feat.position.x.toFixed(1)}, {feat.position.y.toFixed(1)}, {feat.position.z.toFixed(1)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-tertiary">
                  <p>Enter a SMILES and generate to see pharmacophore</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeMode === 'screen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Screening Config */}
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Virtual Screening</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Features</label>
                  <input
                    type="number"
                    value={minFeatures}
                    onChange={(e) => setMinFeatures(parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                    className="w-full p-2 border border-border-light rounded-lg bg-surface-secondary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Library Size</label>
                  <p className="text-2xl font-bold text-primary">{library.length}</p>
                  <p className="text-xs text-text-secondary">compounds</p>
                </div>
                
                <Button 
                  onClick={handleScreen} 
                  disabled={!features.length || loading}
                >
                  {loading ? 'Screening...' : '📋 Start Screening'}
                </Button>
              </div>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 space-y-4">
              {screeningResults ? (
                <>
                  <Card className="bg-gradient-to-r from-success/10 to-primary/10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-primary">{screeningResults.total_screened}</p>
                        <p className="text-xs text-text-secondary">Total Screened</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-success">{screeningResults.total_hits}</p>
                        <p className="text-xs text-text-secondary">Hits Found</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-warning">{(screeningResults.hit_rate * 100).toFixed(1)}%</p>
                        <p className="text-xs text-text-secondary">Hit Rate</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card>
                    <h4 className="font-bold text-text-primary mb-3">Hit Compounds</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {screeningResults.hits?.slice(0, 20).map((hit: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-surface-secondary rounded">
                          <div>
                            <span className="font-mono text-sm">{hit.smiles.substring(0, 30)}...</span>
                            <div className="flex gap-1 mt-1">
                              {hit.features?.slice(0, 3).map((f: any, i: number) => (
                                <span 
                                  key={i}
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: f.color }}
                                />
                              ))}
                            </div>
                          </div>
                          <Badge variant="success">{hit.num_features} features</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="text-center py-12 text-text-tertiary">
                  <p>Generate a pharmacophore and run screening</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeMode === 'align' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alignment Config */}
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Pharmacophore Alignment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Reference SMILES</label>
                  <input
                    type="text"
                    value={refSmiles}
                    onChange={(e) => setRefSmiles(e.target.value)}
                    className="w-full p-2 border border-border-light rounded-lg bg-surface-secondary text-sm font-mono"
                    placeholder="Reference molecule..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile SMILES</label>
                  <input
                    type="text"
                    value={mobileSmiles}
                    onChange={(e) => setMobileSmiles(e.target.value)}
                    className="w-full p-2 border border-border-light rounded-lg bg-surface-secondary text-sm font-mono"
                    placeholder="Molecule to align..."
                  />
                </div>
                
                <Button onClick={handleAlign} disabled={!refSmiles || !mobileSmiles || loading}>
                  {loading ? 'Aligning...' : '🔗 Align Molecules'}
                </Button>
              </div>
            </Card>

            {/* Results */}
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Alignment Results</h3>
              
              {alignmentResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">
                        {(alignmentResult.jaccard_similarity * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-text-secondary">Jaccard Similarity</p>
                    </div>
                    <div className="p-3 bg-success/10 rounded-lg text-center">
                      <p className="text-2xl font-bold text-success">
                        {alignmentResult.rmsd.toFixed(2)} Å
                      </p>
                      <p className="text-xs text-text-secondary">RMSD</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-surface-secondary rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Score: </span>
                      {(alignmentResult.score * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Features Matched: </span>
                      {alignmentResult.num_features_matched}
                    </p>
                  </div>
                  
                  {/* Both molecules */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Reference</p>
                      <Molecule2DViewer smiles={refSmiles} width={150} height={120} />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Mobile</p>
                      <Molecule2DViewer smiles={mobileSmiles} width={150} height={120} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-tertiary">
                  <p>Enter molecules to align</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </TabPanel>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-500/5 border-blue-500/20">
        <h4 className="font-medium text-blue-600 mb-2">💡 About Pharmacophore Modeling</h4>
        <p className="text-xs text-text-secondary">
          Pharmacophores represent the essential 3D arrangement of functional groups in a molecule that 
          are responsible for its biological activity. This Discovery Studio-like interface allows you to:
        </p>
        <ul className="text-xs text-text-secondary mt-2 list-disc list-inside space-y-1">
          <li>Generate pharmacophores from SMILES or PDB structures</li>
          <li>Visualize key features: donors, acceptors, hydrophobic regions, aromatic rings</li>
          <li>Screen compound libraries against a pharmacophore model</li>
          <li>Align molecules to reference pharmacophores</li>
        </ul>
      </Card>
    </div>
  )
}
