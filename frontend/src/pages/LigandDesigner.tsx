import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
// @ts-ignore
import { Editor } from 'ketcher-react'
// @ts-ignore
import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import 'ketcher-react/dist/index.css'

// ─── Singleton struct provider (created once outside component) ───────────────
const structServiceProvider = new StandaloneStructServiceProvider()

// ─── Constants ────────────────────────────────────────────────────────────────
const RECENT_KEY = 'ligand_designer_recent'

const FDA_DRUGS = [
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', use: 'Anti-inflammatory' },
  { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C', use: 'Stimulant' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', use: 'Analgesic' },
  { name: 'Acetaminophen', smiles: 'CC(=O)Nc1ccc(cc1)O', use: 'Analgesic' },
  { name: 'Lisinopril', smiles: 'c1ccc2c(c1)CCCC2C(=O)NCCCC(N)C(=O)O', use: 'ACE inhibitor' },
  { name: 'Metformin', smiles: 'CN(C)C(=N)NC(N)=N', use: 'Diabetes' },
  { name: 'Warfarin', smiles: 'CC(=O)CC(c1ccccc1)c1c(O)c2ccccc2oc1=O', use: 'Anticoagulant' },
  { name: 'Sildenafil', smiles: 'CCCC1=NN(C)C2=C1N=C(NC2=O)c1cc(ccc1OCC)S(=O)(=O)N1CCN(C)CC1', use: 'PDE5 inhibitor' },
  { name: 'Atorvastatin', smiles: 'CC(C)c1n(CC(O)CC(O)CC(=O)O)c2ccc(F)cc2c1C(=O)Nc1ccccc1', use: 'Statin' },
  { name: 'Omeprazole', smiles: 'COc1ccc2[nH]c(cc2c1)S(=O)Cc1ncc(C)c(OC)n1', use: 'PPI' },
  { name: 'Methotrexate', smiles: 'CN(Cc1cnc2nc(N)nc(N)c2n1)c1ccc(cc1)C(=O)NC(CCC(=O)O)C(=O)O', use: 'Anticancer' },
  { name: 'Erlotinib', smiles: 'COCCOc1cc2ncnc(Nc3cccc(c3)C#C)c2cc1OCCOC', use: 'EGFR inhibitor' },
]

const HETEROCYCLES = [
  { name: 'Pyridine', smiles: 'c1ccncc1' }, { name: 'Pyrimidine', smiles: 'c1cncnc1' },
  { name: 'Piperidine', smiles: 'C1CCNCC1' }, { name: 'Pyrrole', smiles: 'c1cc[nH]c1' },
  { name: 'Imidazole', smiles: 'c1cnc[nH]1' }, { name: 'Indole', smiles: 'c1ccc2[nH]ccc2c1' },
  { name: 'Quinoline', smiles: 'c1ccc2ncccc2c1' }, { name: 'Thiazole', smiles: 'c1cncs1' },
  { name: 'Benzimidazole', smiles: 'c1ccc2nc[nH]c2c1' }, { name: 'Quinazoline', smiles: 'c1cnc2ccccc2n1' },
  { name: 'Morpholine', smiles: 'C1COCCN1' }, { name: 'Piperazine', smiles: 'C1CNCCN1' },
  { name: 'Oxetane', smiles: 'C1COC1' }, { name: 'Furan', smiles: 'c1ccoc1' },
  { name: 'Triazole', smiles: 'c1cnn[nH]1' }, { name: 'Tetrazole', smiles: 'c1nnn[nH]1' },
]

const AMINO_ACIDS = [
  { name: 'Alanine', smiles: 'C[C@H](N)C(=O)O' }, { name: 'Glycine', smiles: 'NCC(=O)O' },
  { name: 'Phenylalanine', smiles: 'N[C@@H](Cc1ccccc1)C(=O)O' }, { name: 'Tyrosine', smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O' },
  { name: 'Tryptophan', smiles: 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O' }, { name: 'Lysine', smiles: 'NCCCC[C@H](N)C(=O)O' },
  { name: 'Serine', smiles: 'N[C@@H](CO)C(=O)O' }, { name: 'Cysteine', smiles: 'N[C@@H](CS)C(=O)O' },
]

const KINASE_SCAFFOLDS = [
  { name: 'Imatinib core', smiles: 'Cc1ccc(cc1Nc2nccc(n2)c3cccnc3)NC(=O)c4ccc(cc4)CN5CCN(CC5)C' },
  { name: 'Pyrimidine-amine', smiles: 'Nc1ccnc(n1)Nc2ccccc2' },
  { name: 'Indazole', smiles: 'c1ccc2[nH]ncc2c1' },
  { name: 'Aminopyrazole', smiles: 'Nc1cc(nn1)c2ccccc2' },
  { name: 'Quinazoline', smiles: 'c1cnc2ccccc2n1' },
  { name: 'Oxindole', smiles: 'O=C1Cc2ccccc2N1' },
]

const NATURAL_PRODUCTS = [
  { name: 'Quercetin', smiles: 'O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc(O)c12' },
  { name: 'Resveratrol', smiles: 'Oc1ccc(cc1)/C=C/c2cc(O)cc(O)c2' },
  { name: 'Curcumin', smiles: 'COc1cc(/C=C/C(=O)CC(=O)/C=C/c2ccc(O)c(OC)c2)ccc1O' },
  { name: 'Berberine', smiles: 'COc1ccc2c(c1OC)C=C1c3cc4c(cc3[N+](=CC1=2)C)OCO4' },
  { name: 'Epigallocatechin', smiles: 'Oc1cc(O)c2c(c1)O[C@@H](c1cc(O)c(O)c(O)c1)[C@H](O)C2' },
]

const LINKERS = [
  { name: 'PEG2', smiles: 'OCCOCCO' }, { name: 'Piperazine', smiles: 'C1CNCCN1' },
  { name: 'Alkyl-4C', smiles: 'CCCC' }, { name: 'Urea', smiles: 'NC(=O)N' },
  { name: 'Amide', smiles: 'CC(=O)N' }, { name: 'Sulfonamide', smiles: 'NS(=O)(=O)C' },
  { name: 'Ether', smiles: 'COC' }, { name: 'Triazole', smiles: 'c1cnn[nH]1' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface Properties {
  mw: number | null; logp: number | null; hbd: number | null; hba: number | null
  tpsa: number | null; rotatable: number | null; formula: string | null; valid: boolean
}
interface Alert { name: string; type: 'pains' | 'reactive' | 'ames'; severity: 'high' | 'medium' | 'low'; smarts: string }
interface FunctionalGroup { name: string; count: number; color: string }
interface NmrPeak { atom: string; environment: string; shift_min: number; shift_max: number; nucleus: '1H' | '13C' }
interface ScaffoldCut { bond_type: string; reason: string; fragment1: string; fragment2: string }
interface SimilarMol { smiles: string; name: string; tanimoto: number; cid: number }

// ─── Helper Components ────────────────────────────────────────────────────────
function RuleCheck({ pass, label, value }: { pass: boolean; label: string; value?: string }) {
  return (
    <div className={`flex justify-between items-center text-xs py-0.5 px-2 rounded ${pass ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
      <span>{pass ? '✓' : '✗'} {label}</span>
      {value && <span className="font-mono">{value}</span>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LigandDesigner() {
  const navigate = useNavigate()
  const ketcherRef = useRef<any>(null)
  const smilesCache = useRef<Record<string, any>>({})
  const currentSmiles = useRef('')

  // Core state
  const [smiles, setSmiles] = useState('CC(=O)Oc1ccccc1C(=O)O')
  const [molName, setMolName] = useState('Aspirin')
  const [ketcherReady, setKetcherReady] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [loading, setLoading] = useState(false)

  // Analysis state
  const [properties, setProperties] = useState<Properties>({ mw: 180.16, logp: 1.19, hbd: 1, hba: 3, tpsa: 63.6, rotatable: 4, formula: 'C9H8O4', valid: true })
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [functionalGroups, setFunctionalGroups] = useState<FunctionalGroup[]>([])
  const [saScore, setSaScore] = useState<number | null>(null)
  const [scaffold, setScaffold] = useState<string>('')
  const [nmrData, setNmrData] = useState<NmrPeak[]>([])
  const [scaffoldCuts, setScaffoldCuts] = useState<ScaffoldCut[]>([])
  const [similarMolecules, setSimilarMolecules] = useState<SimilarMol[]>([])
  const [dockingPrep, setDockingPrep] = useState<any>(null)
  const [pdb3d, setPdb3d] = useState('')
  const [conformers, setConformers] = useState<Array<{ energy: number; idx: number }>>([])
  const [iupacName, setIupacName] = useState('')
  const [inchi, setInchi] = useState('')
  const [inchiKey, setInchiKey] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ text: string; type: 'good' | 'warning' | 'info' }>>([])

  // UI state
  const [activeRightTab, setActiveRightTab] = useState<'properties' | 'intelligence' | '3d' | 'search'>('properties')
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateFilter, setTemplateFilter] = useState('')
  const [showKinase, setShowKinase] = useState(false)
  const [showNatural, setShowNatural] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [pubchemQuery, setPubchemQuery] = useState('')
  const [pubchemLoading, setPubchemLoading] = useState(false)
  const [pubchemError, setPubchemError] = useState('')
  const [recentMolecules, setRecentMolecules] = useState<Array<{ name: string; smiles: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  })
  const [similarityLoading, setSimilarityLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiOptimizeGoal, setAiOptimizeGoal] = useState('improve drug-likeness')
  const [aiMolecules, setAiMolecules] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)

  // ─── Caching helpers ──────────────────────────────────────────────────────
  const getCached = (smi: string) => smilesCache.current[smi] || null
  const setCached = (smi: string, data: any) => { smilesCache.current[smi] = data }

  // ─── Save to recent ───────────────────────────────────────────────────────
  const saveToRecent = useCallback((name: string, smi: string) => {
    if (!smi) return
    const updated = [{ name, smiles: smi }, ...recentMolecules.filter(m => m.smiles !== smi)].slice(0, 8)
    setRecentMolecules(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }, [recentMolecules])

  // ─── Core analysis (parallel, cached) ────────────────────────────────────
  const triggerCoreAnalysis = useCallback(async (smi: string) => {
    if (!smi || smi === currentSmiles.current) return
    currentSmiles.current = smi

    const cached = getCached(smi)
    if (cached) {
      if (cached.properties) setProperties(cached.properties)
      if (cached.alerts) setAlerts(cached.alerts)
      if (cached.functionalGroups) setFunctionalGroups(cached.functionalGroups)
      return
    }

    const body = JSON.stringify({ smiles: smi })
    const headers = { 'Content-Type': 'application/json' }

    try {
      const [propsRes, alertsRes, groupsRes] = await Promise.allSettled([
        fetch('/api/chem/properties', { method: 'POST', headers, body }),
        fetch('/api/chem/alerts', { method: 'POST', headers, body }),
        fetch('/api/chem/functional-groups', { method: 'POST', headers, body }),
      ])

      const result: any = {}

      if (propsRes.status === 'fulfilled' && propsRes.value.ok) {
        const d = await propsRes.value.json()
        if (d && !d.error) {
          const props = { mw: d.mw, logp: d.logp, hbd: d.hbd, hba: d.hba, tpsa: d.tpsa, rotatable: d.rotatable_bonds, formula: d.formula, valid: d.valid !== false }
          setProperties(props)
          result.properties = props
        }
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const d = await alertsRes.value.json()
        if (d.alerts) { setAlerts(d.alerts); result.alerts = d.alerts }
      } else {
        setAlerts([])
      }

      if (groupsRes.status === 'fulfilled' && groupsRes.value.ok) {
        const d = await groupsRes.value.json()
        if (d.groups) { setFunctionalGroups(d.groups); result.functionalGroups = d.groups }
      } else {
        setFunctionalGroups([])
      }

      setCached(smi, result)
    } catch {
      // network error — keep existing state
    }
  }, [])

  // ─── Ketcher event-driven change handler ─────────────────────────────────
  const handleEditorChange = useCallback(async () => {
    if (!ketcherRef.current) return
    try {
      const smi = await ketcherRef.current.getSmiles()
      if (smi && smi !== currentSmiles.current) {
        setSmiles(smi)
        triggerCoreAnalysis(smi)
      }
    } catch {
      // empty canvas — clear panels
      setSmiles('')
      setProperties({ mw: null, logp: null, hbd: null, hba: null, tpsa: null, rotatable: null, formula: null, valid: false })
    }
  }, [triggerCoreAnalysis])

  // ─── Ketcher init ─────────────────────────────────────────────────────────
  const handleKetcherInit = useCallback((ketcher: any) => {
    ketcherRef.current = ketcher
    setKetcherReady(true)
    setEditorError('')

    // Event-driven updates — no polling
    try {
      ketcher.editor.subscribe('change', handleEditorChange)
    } catch {
      // fallback: some builds use different event name
      try { ketcher.editor.subscribe('editor-change', handleEditorChange) } catch { /* no-op */ }
    }

    // Load initial molecule
    if (smiles) {
      setTimeout(() => {
        ketcher.setMolecule(smiles).catch(() => {})
      }, 300)
    }
  }, [handleEditorChange, smiles])

  // ─── Load structure into Ketcher ──────────────────────────────────────────
  const loadIntoKetcher = useCallback(async (smi: string, name?: string) => {
    setSmiles(smi)
    if (name) setMolName(name)
    if (ketcherRef.current) {
      try {
        await ketcherRef.current.setMolecule(smi)
      } catch {
        setEditorError('Could not load structure into editor')
      }
    }
    triggerCoreAnalysis(smi)
    // Reset advanced panels
    setSaScore(null); setScaffold(''); setNmrData([]); setScaffoldCuts([])
    setSimilarMolecules([]); setDockingPrep(null); setPdb3d(''); setConformers([])
  }, [triggerCoreAnalysis])

  // ─── PubChem search ───────────────────────────────────────────────────────
  const searchPubChem = async () => {
    if (!pubchemQuery.trim()) return
    setPubchemLoading(true); setPubchemError('')
    try {
      const q = encodeURIComponent(pubchemQuery.trim())
      const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${q}/property/IsomericSMILES,MolecularFormula,MolecularWeight,IUPACName/JSON`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      const p = data?.PropertyTable?.Properties?.[0]
      if (p?.IsomericSMILES) {
        const name = pubchemQuery.trim()
        if (p.IUPACName) setIupacName(p.IUPACName)
        saveToRecent(name, p.IsomericSMILES)
        setSuggestions([{ text: `✓ Loaded from PubChem: MW=${parseFloat(p.MolecularWeight || '0').toFixed(1)} Da, Formula=${p.MolecularFormula}`, type: 'good' }])
        await loadIntoKetcher(p.IsomericSMILES, name)
      } else { setPubchemError('Compound not found') }
    } catch (e: any) { setPubchemError(`PubChem: ${e.message || 'Not found'}`) }
    setPubchemLoading(false)
  }

  // ─── Advanced analysis functions ──────────────────────────────────────────
  const fetchSAScore = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/sa-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.sa_score != null) setSaScore(d.sa_score)
    } catch { /* no-op */ }
  }

  const fetchScaffold = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/scaffold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.scaffold) setScaffold(d.scaffold)
    } catch { /* no-op */ }
  }

  const fetchNMR = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/nmr-predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.peaks) setNmrData(d.peaks)
    } catch { /* no-op */ }
  }

  const fetchScaffoldCuts = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/scaffold-cuts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.cuts) setScaffoldCuts(d.cuts)
    } catch { /* no-op */ }
  }

  const fetchSimilarity = async () => {
    if (!smiles) return
    setSimilarityLoading(true)
    try {
      const res = await fetch('/api/chem/similarity-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles, threshold: 0.7, max_results: 10 }) })
      const d = await res.json()
      if (d.results) setSimilarMolecules(d.results)
    } catch { /* no-op */ }
    setSimilarityLoading(false)
  }

  const fetchIUPAC = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/iupac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      setIupacName(d.iupac || 'Unavailable')
    } catch { setIupacName('Unavailable') }
  }

  const fetchInChI = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/inchi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      setInchi(d.inchi || ''); setInchiKey(d.inchi_key || '')
    } catch { /* no-op */ }
  }

  const generate3D = async () => {
    if (!smiles) return
    setLoading(true)
    try {
      const res = await fetch('/api/chem/conformers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles, n_conformers: 3 }) })
      const d = await res.json()
      if (d.n_conformers) {
        const list = d.energies.map((e: number, i: number) => ({ energy: e, idx: i })).sort((a: any, b: any) => a.energy - b.energy)
        setConformers(list)
        setPdb3d(d.pdb || '')
        setActiveRightTab('3d')
      }
    } catch { /* no-op */ }
    setLoading(false)
  }

  const prepareDocking = async () => {
    if (!smiles) return
    setLoading(true)
    try {
      const res = await fetch('/api/chem/docking-prep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.ready_for_docking) {
        setDockingPrep(d)
        setSuggestions(prev => [{ text: `✓ Docking ready: ${d.n_atoms} atoms, charge ${d.charge}, ${d.n_rotatable} rotatable bonds`, type: 'good' }, ...prev.slice(0, 4)])
      }
    } catch { /* no-op */ }
    setLoading(false)
  }

  // ─── Export functions ─────────────────────────────────────────────────────
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const exportSMILES = () => {
    if (smiles) downloadFile(smiles, `${molName || 'molecule'}.smi`, 'chemical/x-daylight-smiles')
  }

  const exportMOL = async () => {
    if (!ketcherRef.current) return
    try {
      const mol = await ketcherRef.current.getMolfile()
      downloadFile(mol, `${molName || 'molecule'}.mol`, 'chemical/x-mdl-molfile')
    } catch { /* no-op */ }
  }

  const exportSDF = async () => {
    if (!ketcherRef.current) return
    try {
      const mol = await ketcherRef.current.getMolfile()
      const sdf = mol + '\n> <Name>\n' + (molName || 'Molecule') + '\n\n> <SMILES>\n' + smiles + '\n\n$$$$\n'
      downloadFile(sdf, `${molName || 'molecule'}.sdf`, 'chemical/x-mdl-sdfile')
    } catch { /* no-op */ }
  }

  const exportPNG = async () => {
    if (!ketcherRef.current) return
    try {
      const image = await ketcherRef.current.generateImage(smiles, { outputFormat: 'png', backgroundColor: 'white', width: 800, height: 600 })
      const url = URL.createObjectURL(image)
      const a = document.createElement('a'); a.href = url; a.download = `${molName || 'molecule'}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* no-op */ }
  }

  const exportInChI = async () => {
    if (!inchi) await fetchInChI()
    const content = `InChI=${inchi}\nInChIKey=${inchiKey}\nSMILES=${smiles}\n`
    downloadFile(content, `${molName || 'molecule'}.txt`, 'text/plain')
  }

  const exportSMARTS = async () => {
    if (!smiles) return
    try {
      const res = await fetch('/api/chem/to-smarts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles }) })
      const d = await res.json()
      if (d.smarts) downloadFile(d.smarts, `${molName || 'molecule'}.smarts`, 'text/plain')
    } catch { /* no-op */ }
  }

  const copySmiles = () => { if (smiles) navigator.clipboard.writeText(smiles) }

  // ─── Navigation ───────────────────────────────────────────────────────────
  const sendToQSAR = () => { sessionStorage.setItem('qsar_smiles', smiles); navigate('/qsar') }
  const sendToADMET = () => { sessionStorage.setItem('admet_smiles', smiles); navigate('/admet') }
  const sendToDocking = () => { sessionStorage.setItem('ligand_smiles', smiles); navigate('/docking') }

  // ─── AI Ligand Generation ─────────────────────────────────────────────────
  const aiGenerate = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true); setAiError(''); setAiMolecules([])
    try {
      const res = await fetch('/api/ai/generate-ligands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, count: 10 }),
      })
      const data = await res.json()
      if (data.error) setAiError(data.error)
      else setAiMolecules(data.molecules || [])
    } catch (e: any) { setAiError(e.message || 'Generation failed') }
    setAiLoading(false)
  }

  const aiOptimize = async () => {
    if (!smiles) return
    setAiLoading(true); setAiError(''); setAiMolecules([])
    try {
      const res = await fetch('/api/ai/optimize-ligand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles, goal: aiOptimizeGoal }),
      })
      const data = await res.json()
      if (data.error) setAiError(data.error)
      else setAiMolecules(data.molecules || [])
    } catch (e: any) { setAiError(e.message || 'Optimization failed') }
    setAiLoading(false)
  }

  // ─── Template filter ──────────────────────────────────────────────────────
  const lc = templateFilter.toLowerCase()
  const filteredHeterocycles = HETEROCYCLES.filter(t => t.name.toLowerCase().includes(lc))
  const filteredAminoAcids = AMINO_ACIDS.filter(t => t.name.toLowerCase().includes(lc))
  const filteredLinkers = LINKERS.filter(t => t.name.toLowerCase().includes(lc))

  // ─── SA Score colour ──────────────────────────────────────────────────────
  const saColor = saScore == null ? 'text-gray-400' : saScore <= 3 ? 'text-green-600' : saScore <= 5 ? 'text-amber-500' : saScore <= 7 ? 'text-orange-500' : 'text-red-600'
  const saLabel = saScore == null ? '—' : saScore <= 3 ? 'Easy' : saScore <= 5 ? 'Moderate' : saScore <= 7 ? 'Difficult' : 'Very Difficult'

  // ─── Severity badge ───────────────────────────────────────────────────────
  const alertBg = (s: string) => s === 'high' ? 'bg-red-100 text-red-700' : s === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-50 text-yellow-700'
  const typeBg = (t: string) => t === 'pains' ? 'bg-red-50 border-red-400' : t === 'reactive' ? 'bg-orange-50 border-orange-400' : 'bg-yellow-50 border-yellow-400'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">

      {/* ── Top Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center gap-2 flex-shrink-0 flex-wrap">
        <span className="text-sm font-bold text-cyan-400 mr-2">⬡ Ligand Designer</span>
        <span className="text-xs text-gray-500 mr-2">Draw · Analyze · Dock</span>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <button onClick={copySmiles} className="px-2 py-1 text-xs rounded border border-slate-600 text-gray-300 hover:bg-slate-700">Copy SMILES</button>
        {/* Export dropdown */}
        <div className="relative">
          <button onClick={() => setShowExport(v => !v)} className="px-2 py-1 text-xs rounded border border-slate-600 text-gray-300 hover:bg-slate-700">Export ▾</button>
          {showExport && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
              {[
                { label: 'SMILES (.smi)', action: exportSMILES },
                { label: 'SMARTS (.smarts)', action: exportSMARTS },
                { label: 'MOL V2000', action: exportMOL },
                { label: 'SDF File', action: exportSDF },
                { label: 'InChI / Key', action: exportInChI },
                { label: 'PNG (800×600)', action: exportPNG },
              ].map(item => (
                <button key={item.label} onClick={() => { item.action(); setShowExport(false) }}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg">
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <button onClick={generate3D} disabled={loading || !ketcherReady} className="px-2 py-1 text-xs rounded bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-40">
          {loading ? '…' : '⬡ 3D Conformer'}
        </button>
        <button onClick={prepareDocking} disabled={loading || !smiles} className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40">Docking Prep</button>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <button onClick={sendToDocking} disabled={!smiles} className="px-2 py-1 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40">→ Dock</button>
        <button onClick={sendToQSAR} disabled={!smiles} className="px-2 py-1 text-xs rounded bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-40">→ QSAR</button>
        <button onClick={sendToADMET} disabled={!smiles} className="px-2 py-1 text-xs rounded bg-green-700 hover:bg-green-600 text-white disabled:opacity-40">→ ADMET</button>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <button onClick={() => setShowAiPanel(v => !v)} className={`px-2 py-1 text-xs rounded transition-colors ${showAiPanel ? 'bg-purple-600 text-white' : 'border border-slate-600 text-gray-300 hover:bg-slate-700'}`}>🧠 AI Generate</button>
        <div className="flex-1" />
        {ketcherReady && <span className="text-xs text-green-400">● Editor Ready</span>}
        {!ketcherReady && <span className="text-xs text-amber-400">○ Loading Editor…</span>}
        {editorError && <span className="text-xs text-red-400 ml-2">⚠ {editorError}</span>}
        {molName && <span className="text-xs text-cyan-300 font-medium ml-2">{molName}</span>}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {editorError && (
        <div className="bg-red-900 text-red-200 text-xs px-4 py-1 flex items-center gap-2 flex-shrink-0">
          <span>⚠</span><span>{editorError}</span>
          <button onClick={() => setEditorError('')} className="ml-auto text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Main Layout ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Panel ───────────────────────────────────────────────── */}
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">

          {/* PubChem Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2">🔍 Search (Name / CID / InChIKey)</div>
            <div className="flex gap-1">
              <input type="text" value={pubchemQuery} onChange={e => setPubchemQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchPubChem()}
                placeholder="e.g. Imatinib, aspirin…"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-cyan-400 outline-none" />
              <button onClick={searchPubChem} disabled={pubchemLoading}
                className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50 font-medium">
                {pubchemLoading ? '…' : 'Go'}
              </button>
            </div>
            {pubchemError && <p className="text-xs text-red-500 mt-1">{pubchemError}</p>}
          </div>

          {/* Recent molecules */}
          {recentMolecules.length > 0 && (
            <div className="p-3 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-1">🕐 Recent</div>
              <div className="space-y-0.5">
                {recentMolecules.map((m, i) => (
                  <button key={i} onClick={() => loadIntoKetcher(m.smiles, m.name)}
                    className="w-full text-left text-xs px-2 py-1 bg-gray-50 hover:bg-cyan-50 border border-gray-200 rounded truncate transition-colors text-gray-700 hover:text-cyan-700">
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SMILES manual input */}
          <div className="p-3 border-b border-gray-200">
            <label className="text-xs font-medium text-gray-600 mb-1 block">SMILES (manual input)</label>
            <textarea value={smiles} onChange={e => loadIntoKetcher(e.target.value)}
              className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded resize-none bg-gray-50 focus:ring-1 focus:ring-cyan-400 outline-none"
              rows={3} placeholder="Paste SMILES here…" />
            <div className="flex gap-1 mt-1">
              <button onClick={() => { triggerCoreAnalysis(smiles); saveToRecent(molName, smiles) }}
                className="flex-1 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded">Analyze</button>
              <button onClick={() => loadIntoKetcher('')} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-600">Clear</button>
            </div>
          </div>

          {/* Molecule name */}
          <div className="px-3 py-2 border-b border-gray-200">
            <label className="text-xs font-medium text-gray-600">Molecule Name</label>
            <input value={molName} onChange={e => setMolName(e.target.value)}
              className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-cyan-400 outline-none" placeholder="Name your compound…" />
          </div>

          {/* Template Library */}
          <div className="border-b border-gray-200">
            <button onClick={() => setShowTemplates(v => !v)}
              className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <span>📚 Template Library ({FDA_DRUGS.length + HETEROCYCLES.length + AMINO_ACIDS.length + LINKERS.length + KINASE_SCAFFOLDS.length + NATURAL_PRODUCTS.length})</span>
              <span className="text-gray-400">{showTemplates ? '▲' : '▼'}</span>
            </button>
            {showTemplates && (
              <div className="px-3 pb-3">
                <input type="text" placeholder="Filter templates…" value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2 bg-gray-50 outline-none" />
                {[
                  { label: 'FDA Approved Drugs', items: FDA_DRUGS, bg: 'hover:bg-cyan-50 hover:text-cyan-700' },
                ].map(({ label, items, bg }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {(items as any[]).filter(t => t.name.toLowerCase().includes(lc)).map((t: any) => (
                        <button key={t.name} onClick={() => { loadIntoKetcher(t.smiles, t.name); saveToRecent(t.name, t.smiles) }}
                          className={`text-xs px-2 py-1 bg-gray-50 ${bg} border border-gray-200 rounded text-left transition-colors`} title={t.use || t.smiles}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs font-medium text-gray-500 mb-1">Heterocycles</p>
                <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto mb-2">
                  {filteredHeterocycles.map(t => (
                    <button key={t.name} onClick={() => loadIntoKetcher(t.smiles, t.name)}
                      className="text-xs px-2 py-1 bg-gray-50 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 rounded text-left transition-colors">{t.name}</button>
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Amino Acids</p>
                <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto mb-2">
                  {filteredAminoAcids.map(t => (
                    <button key={t.name} onClick={() => loadIntoKetcher(t.smiles, t.name)}
                      className="text-xs px-2 py-1 bg-gray-50 hover:bg-green-50 hover:text-green-700 border border-gray-200 rounded text-left transition-colors">{t.name}</button>
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Linkers</p>
                <div className="grid grid-cols-2 gap-1 max-h-20 overflow-y-auto mb-2">
                  {filteredLinkers.map(t => (
                    <button key={t.name} onClick={() => loadIntoKetcher(t.smiles, t.name)}
                      className="text-xs px-2 py-1 bg-gray-50 hover:bg-amber-50 hover:text-amber-700 border border-gray-200 rounded text-left transition-colors">{t.name}</button>
                  ))}
                </div>
                <button onClick={() => setShowKinase(v => !v)} className="w-full flex justify-between text-xs font-medium text-gray-500 mb-1">
                  <span>Kinase Scaffolds</span><span>{showKinase ? '▲' : '▼'}</span>
                </button>
                {showKinase && (
                  <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto mb-2">
                    {KINASE_SCAFFOLDS.filter(t => t.name.toLowerCase().includes(lc)).map(t => (
                      <button key={t.name} onClick={() => loadIntoKetcher(t.smiles, t.name)}
                        className="text-xs px-2 py-1 bg-gray-50 hover:bg-rose-50 hover:text-rose-700 border border-gray-200 rounded text-left transition-colors">{t.name}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowNatural(v => !v)} className="w-full flex justify-between text-xs font-medium text-gray-500 mb-1">
                  <span>Natural Products</span><span>{showNatural ? '▲' : '▼'}</span>
                </button>
                {showNatural && (
                  <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                    {NATURAL_PRODUCTS.filter(t => t.name.toLowerCase().includes(lc)).map(t => (
                      <button key={t.name} onClick={() => loadIntoKetcher(t.smiles, t.name)}
                        className="text-xs px-2 py-1 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 rounded text-left transition-colors">{t.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">💡 Suggestions</div>
              <div className="space-y-1">
                {suggestions.map((s, i) => (
                  <div key={i} className={`text-xs p-2 rounded border-l-2 ${s.type === 'good' ? 'bg-green-50 border-green-500 text-green-700' : s.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-cyan-50 border-cyan-500 text-cyan-700'}`}>
                    {s.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Ligand Generation Panel */}
          {showAiPanel && (
            <div className="p-3 border-t border-gray-200">
              <div className="text-xs font-semibold text-purple-700 mb-2">🧠 AI Ligand Generation</div>

              {/* Generate new molecules */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Generate molecules for target</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && aiGenerate()}
                  placeholder="e.g. EGFR kinase inhibitor, GPCR agonist"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-purple-400 outline-none mb-1"
                />
                <button
                  onClick={aiGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 font-medium"
                >
                  {aiLoading ? 'Generating…' : 'Generate Molecules'}
                </button>
              </div>

              {/* Optimize current molecule */}
              {smiles && (
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Optimize current molecule</label>
                  <select
                    value={aiOptimizeGoal}
                    onChange={e => setAiOptimizeGoal(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 outline-none mb-1"
                  >
                    <option value="improve drug-likeness">Improve drug-likeness</option>
                    <option value="reduce LogP">Reduce LogP</option>
                    <option value="reduce molecular weight">Reduce MW</option>
                    <option value="improve solubility">Improve solubility</option>
                    <option value="add metabolic stability">Add metabolic stability</option>
                  </select>
                  <button
                    onClick={aiOptimize}
                    disabled={aiLoading || !smiles}
                    className="w-full px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 font-medium"
                  >
                    {aiLoading ? 'Optimizing…' : 'Optimize Molecule'}
                  </button>
                </div>
              )}

              {/* Results */}
              {aiError && <p className="text-xs text-red-500 mb-2">{aiError}</p>}
              {aiMolecules.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">{aiMolecules.length} molecules generated</p>
                  {aiMolecules.map((m: any, i: number) => (
                    <div key={i} className={`text-xs p-2 rounded border ${m.lipinski_pass ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
                      <div className="font-mono text-gray-700 truncate" title={m.smiles}>{m.smiles}</div>
                      <div className="flex gap-2 mt-1 text-gray-500">
                        <span>MW:{m.mw}</span>
                        <span>LogP:{m.logp}</span>
                        <span>HBD:{m.hbd}</span>
                        <span>HBA:{m.hba}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => loadIntoKetcher(m.smiles, `AI_${i + 1}`)}
                          className="flex-1 px-1 py-0.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => { sessionStorage.setItem('ligand_smiles', m.smiles); navigate('/docking') }}
                          className="flex-1 px-1 py-0.5 text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded"
                        >
                          Dock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Ketcher Canvas ────────────────────────────────────────────── */}
        <div className="flex-1 relative min-w-0">
          {!ketcherReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center text-gray-400">
                <div className="text-2xl mb-2">⬡</div>
                <div className="text-sm">Loading Ligand Designer…</div>
                <div className="text-xs mt-1 text-gray-600">Initialising Ketcher engine</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0">
            <Editor
              staticResourcesUrl=""
              structServiceProvider={structServiceProvider as any}
              onInit={handleKetcherInit}
              errorHandler={(err: string) => { setEditorError(err); setKetcherReady(false) }}
              buttons={{}}
            />
          </div>
          {/* SMILES status bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-800 bg-opacity-90 px-3 py-1 text-xs text-gray-400 truncate z-10">
            SMILES: {smiles || <span className="italic text-gray-600">empty canvas</span>}
          </div>
        </div>

        {/* ── Right Intelligence Panel ──────────────────────────────────── */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {([
              { key: 'properties', label: '📊', title: 'Properties & Rules' },
              { key: 'intelligence', label: '🔬', title: 'Intelligence' },
              { key: '3d', label: '⬡', title: '3D & Docking' },
              { key: 'search', label: '🔍', title: 'Search' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setActiveRightTab(t.key)}
                title={t.title}
                className={`flex-1 py-2 text-sm transition-colors ${activeRightTab === t.key ? 'bg-white border-b-2 border-cyan-500 text-cyan-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ─ PROPERTIES TAB ─ */}
            {activeRightTab === 'properties' && (
              <div>
                {/* Color-coded properties */}
                <div className="p-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Molecular Properties</div>
                  <div className="space-y-1">
                    {([
                      { label: 'MW', value: properties.mw?.toFixed(1), unit: 'Da', good: [0, 500], warn: [500, 600] },
                      { label: 'LogP', value: properties.logp?.toFixed(2), unit: '', good: [-0.4, 5], warn: [5, 7] },
                      { label: 'HBD', value: String(properties.hbd ?? '-'), unit: '', good: [0, 5], warn: [5, 8] },
                      { label: 'HBA', value: String(properties.hba ?? '-'), unit: '', good: [0, 10], warn: [10, 14] },
                      { label: 'TPSA', value: properties.tpsa?.toFixed(1), unit: 'Ų', good: [0, 90], warn: [90, 140] },
                      { label: 'RotBonds', value: String(properties.rotatable ?? '-'), unit: '', good: [0, 10], warn: [10, 15] },
                    ] as any[]).map(p => {
                      const num = parseFloat(p.value)
                      const isGood = !isNaN(num) && num >= p.good[0] && num <= p.good[1]
                      const isWarn = !isNaN(num) && num > p.warn[0]
                      const clr = isGood ? 'text-green-700 bg-green-50' : isWarn ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                      return (
                        <div key={p.label} className={`flex justify-between text-xs py-1 px-2 rounded ${clr}`}>
                          <span className="text-gray-600">{p.label}</span>
                          <span className="font-mono font-semibold">{p.value ?? '—'}{p.unit ? ` ${p.unit}` : ''}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between text-xs py-1 px-2 rounded bg-blue-50">
                      <span className="text-gray-600">Formula</span>
                      <span className="font-mono font-semibold text-blue-700">{properties.formula ?? '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Drug-likeness rules */}
                <div className="p-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Drug-likeness Filters</div>
                  <p className="text-xs font-medium text-blue-600 mb-0.5">Lipinski Ro5</p>
                  <div className="space-y-0.5 mb-2">
                    <RuleCheck pass={(properties.mw ?? 0) < 500} label="MW < 500 Da" value={properties.mw?.toFixed(1)} />
                    <RuleCheck pass={Math.abs(properties.logp ?? 99) < 5} label="LogP < 5" value={properties.logp?.toFixed(2)} />
                    <RuleCheck pass={(properties.hbd ?? 99) <= 5} label="HBD ≤ 5" value={String(properties.hbd ?? '—')} />
                    <RuleCheck pass={(properties.hba ?? 99) <= 10} label="HBA ≤ 10" value={String(properties.hba ?? '—')} />
                  </div>
                  <p className="text-xs font-medium text-purple-600 mb-0.5">Veber (Oral Bioavailability)</p>
                  <div className="space-y-0.5 mb-2">
                    <RuleCheck pass={(properties.tpsa ?? 999) <= 140} label="TPSA ≤ 140 Ų" value={properties.tpsa?.toFixed(1)} />
                    <RuleCheck pass={(properties.rotatable ?? 999) <= 10} label="RotBonds ≤ 10" value={String(properties.rotatable ?? '—')} />
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mb-0.5">Ghose Filter</p>
                  <div className="space-y-0.5 mb-2">
                    <RuleCheck pass={(properties.mw ?? 0) >= 160 && (properties.mw ?? 0) <= 480} label="160 ≤ MW ≤ 480" value={properties.mw?.toFixed(1)} />
                    <RuleCheck pass={(properties.logp ?? -99) >= -0.4 && (properties.logp ?? 99) <= 5.6} label="-0.4 ≤ LogP ≤ 5.6" value={properties.logp?.toFixed(2)} />
                  </div>
                  <p className="text-xs font-medium text-rose-600 mb-0.5">Pfizer 3/75</p>
                  <div className="space-y-0.5">
                    <RuleCheck pass={(properties.logp ?? 99) <= 3} label="LogP ≤ 3" value={properties.logp?.toFixed(2)} />
                    <RuleCheck pass={(properties.tpsa ?? 0) >= 75} label="TPSA ≥ 75 Ų" value={properties.tpsa?.toFixed(1)} />
                  </div>
                </div>

                {/* Identifiers */}
                <div className="p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Identifiers</div>
                  <div className="space-y-1">
                    <button onClick={fetchIUPAC} className="w-full text-left text-xs text-blue-600 hover:underline truncate">
                      {iupacName ? `IUPAC: ${iupacName}` : 'Get IUPAC Name →'}
                    </button>
                    <button onClick={fetchInChI} className="w-full text-left text-xs text-blue-600 hover:underline truncate">
                      {inchiKey ? `InChIKey: ${inchiKey}` : 'Get InChI / InChIKey →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─ INTELLIGENCE TAB ─ */}
            {activeRightTab === 'intelligence' && (
              <div>
                {/* PAINS / Toxicity Alerts */}
                <div className="border-b border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700">⚠ PAINS & Toxicity Alerts</span>
                    {alerts.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{alerts.length}</span>}
                  </div>
                  <div className="p-3">
                    {alerts.length === 0 ? (
                      <p className="text-xs text-green-600 bg-green-50 p-2 rounded">✓ No PAINS or structural alerts detected</p>
                    ) : (
                      <div className="space-y-1">
                        {alerts.map((a, i) => (
                          <div key={i} className={`text-xs p-2 rounded border-l-2 ${typeBg(a.type)}`}>
                            <div className="flex justify-between items-start">
                              <span className="font-medium">{a.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${alertBg(a.severity)}`}>{a.severity}</span>
                            </div>
                            <div className="text-gray-500 mt-0.5 uppercase">{a.type}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Functional Groups */}
                <div className="border-b border-gray-200">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700">🧩 Functional Groups</div>
                  <div className="p-3">
                    {functionalGroups.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Detected groups will appear here after analysis</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {functionalGroups.map((g, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.color || 'bg-gray-100 text-gray-700'}`}>
                            {g.name}{g.count > 1 ? ` ×${g.count}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SA Score */}
                <div className="border-b border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700">🔬 Synthetic Accessibility</span>
                    <button onClick={fetchSAScore} className="text-xs text-cyan-600 hover:underline">Calculate</button>
                  </div>
                  <div className="p-3">
                    {saScore == null ? (
                      <p className="text-xs text-gray-500 italic">Click Calculate to compute SA Score (1=easy, 10=hard)</p>
                    ) : (
                      <div>
                        <div className={`text-2xl font-bold ${saColor}`}>{saScore.toFixed(1)}</div>
                        <div className={`text-xs font-medium ${saColor}`}>{saLabel}</div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${saScore <= 3 ? 'bg-green-500' : saScore <= 5 ? 'bg-amber-500' : saScore <= 7 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${(saScore / 10) * 100}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Scale: 1 (easy) → 10 (very difficult)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Murcko Scaffold */}
                <div className="border-b border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700">🔗 Murcko Scaffold</span>
                    <button onClick={fetchScaffold} className="text-xs text-cyan-600 hover:underline">Extract</button>
                  </div>
                  {scaffold && (
                    <div className="p-3">
                      <div className="font-mono text-xs bg-gray-50 p-2 rounded break-all text-gray-700">{scaffold}</div>
                      <button onClick={() => loadIntoKetcher(scaffold, 'Scaffold')} className="mt-1 w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">Load scaffold</button>
                    </div>
                  )}
                </div>

                {/* Estimated NMR */}
                <div className="border-b border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700">📈 Estimated NMR</span>
                    <button onClick={fetchNMR} className="text-xs text-cyan-600 hover:underline">Predict</button>
                  </div>
                  {nmrData.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-amber-600 italic mb-2">⚠ Rule-based estimates, not experimental</p>
                      <div className="space-y-0.5 max-h-40 overflow-y-auto">
                        {nmrData.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs py-0.5 px-2 bg-gray-50 rounded">
                            <span className="text-gray-600">{p.atom} <span className="font-mono">{p.nucleus}</span></span>
                            <span className="font-mono text-blue-700">{p.shift_min}–{p.shift_max} ppm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scaffold Disconnections */}
                <div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700">✂ Scaffold Disconnections</span>
                    <button onClick={fetchScaffoldCuts} className="text-xs text-cyan-600 hover:underline">Analyse</button>
                  </div>
                  {scaffoldCuts.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-gray-500 italic mb-2">Suggested disconnections for med-chem exploration</p>
                      <div className="space-y-2">
                        {scaffoldCuts.map((c, i) => (
                          <div key={i} className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="font-medium text-blue-700">{c.bond_type}</div>
                            <div className="text-gray-600 mt-0.5">{c.reason}</div>
                            <div className="mt-1 flex gap-1">
                              <button onClick={() => loadIntoKetcher(c.fragment1, 'Fragment 1')} className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700">Frag 1</button>
                              <button onClick={() => loadIntoKetcher(c.fragment2, 'Fragment 2')} className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700">Frag 2</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─ 3D & DOCKING TAB ─ */}
            {activeRightTab === '3d' && (
              <div>
                <div className="p-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">⬡ 3D Conformer</div>
                  <button onClick={generate3D} disabled={loading || !smiles}
                    className="w-full text-xs px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 transition-colors">
                    {loading ? 'Generating…' : 'Generate 3D Conformers (ETKDG)'}
                  </button>
                  {conformers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {conformers.map((c, i) => (
                        <div key={c.idx} className={`text-xs px-2 py-1 rounded flex justify-between ${i === 0 ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                          <span>Conformer #{i + 1} {i === 0 && '⭐'}</span>
                          <span className="font-mono">{c.energy.toFixed(1)} kcal/mol</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pdb3d && (
                    <button onClick={() => {
                      const blob = new Blob([pdb3d], { type: 'chemical/x-pdb' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = `${molName || 'molecule'}_3d.pdb`; a.click()
                      URL.revokeObjectURL(url)
                    }} className="mt-2 w-full text-xs px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded">
                      Download 3D PDB
                    </button>
                  )}
                </div>

                <div className="p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">🎯 Docking Preparation</div>
                  <button onClick={prepareDocking} disabled={loading || !smiles}
                    className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors mb-2">
                    {loading ? 'Preparing…' : 'Prepare for Docking'}
                  </button>
                  {dockingPrep && (
                    <div className="space-y-1">
                      <div className="text-xs py-1 px-2 bg-green-50 rounded text-green-700 font-medium">✓ Ready for docking</div>
                      {[
                        { label: 'Atoms', val: dockingPrep.n_atoms },
                        { label: 'Charge', val: dockingPrep.charge },
                        { label: 'MW', val: `${dockingPrep.mw} Da` },
                        { label: 'LogP', val: dockingPrep.logp },
                        { label: 'RotBonds', val: dockingPrep.n_rotatable },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                          <span className="text-gray-600">{r.label}</span>
                          <span className="font-mono font-medium">{r.val}</span>
                        </div>
                      ))}
                      <button onClick={sendToDocking} className="mt-1 w-full text-xs px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded">
                        → Send to Docking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─ SEARCH TAB ─ */}
            {activeRightTab === 'search' && (
              <div>
                <div className="p-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">🔍 Similarity Search (PubChem)</div>
                  <button onClick={fetchSimilarity} disabled={similarityLoading || !smiles}
                    className="w-full text-xs px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50 transition-colors mb-1">
                    {similarityLoading ? 'Searching…' : 'Find Similar Compounds (Tanimoto ≥ 0.7)'}
                  </button>
                  <p className="text-xs text-gray-400">Returns top-10 from PubChem by Tanimoto fingerprint</p>
                </div>
                {similarMolecules.length > 0 && (
                  <div className="p-3">
                    <div className="space-y-2">
                      {similarMolecules.map((m, i) => (
                        <div key={i} className="text-xs p-2 bg-gray-50 border border-gray-200 rounded hover:border-cyan-300 transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-700 truncate">{m.name || `CID ${m.cid}`}</span>
                            <span className="text-cyan-600 font-mono font-medium ml-1">{(m.tanimoto * 100).toFixed(0)}%</span>
                          </div>
                          <div className="font-mono text-gray-400 truncate mb-1">{m.smiles.slice(0, 35)}…</div>
                          <button onClick={() => loadIntoKetcher(m.smiles, m.name || `CID_${m.cid}`)}
                            className="w-full px-2 py-0.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded transition-colors">
                            Load into canvas
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
