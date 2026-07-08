'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import {
  Package, Boxes, TrendingUp, AlertTriangle, Plus, Search, Sun, Moon,
  LayoutDashboard, PackageOpen, CalendarClock, LineChart as LineChartIcon,
  Edit3, Trash2, ArrowDownToLine, ArrowUpFromLine, MapPin, Palette,
  Filter, Sparkles, ShieldCheck, FileSpreadsheet, Users, LogOut,
  Lock, UserPlus, Upload, Download, Thermometer, AlertOctagon, Ban, Unlock, KeyRound,
  Mail,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { toast, Toaster } from 'sonner'

const CATEGORIES = ['Matéria-Prima', 'Frios/Laticínios', 'Embalagens', 'Insumos', 'Produto Final', 'Outros']
const CODE_KEYS = ['A', 'B', 'C']
const currency = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const daysUntil = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
const fefoBucket = (product, settings) => {
  const d = daysUntil(product.expiresAt)
  if (d < 0) return 'expired'
  if (d <= (settings?.thresholdCriticalDays ?? 7)) return 'critical'
  if (d <= (settings?.thresholdWarningDays ?? 30)) return 'warning'
  return 'safe'
}

const api = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { ...opts, headers })
  return res
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Button variant="outline" size="icon" className="h-9 w-9" />
  return (
    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function LoginScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) { toast.error('Preencha e-mail e senha'); return }
    setLoading(true)
    try {
      const res = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', body: JSON.stringify({ email, password, name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(mode === 'login' ? 'Bem-vindo!' : 'Conta criada!')
      onAuth(data.user)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const googleSignIn = async () => {
    const fakeEmail = prompt('Simulação Google Sign-In\nInforme seu e-mail Google:')
    if (!fakeEmail) return
    setLoading(true)
    try {
      const res = await api('/auth/google', { method: 'POST', body: JSON.stringify({ email: fakeEmail, name: fakeEmail.split('@')[0] }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success('Login com Google concluído!')
      onAuth(data.user)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Sinergia</CardTitle>
          <CardDescription>Controle inteligente de estoque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 rounded-lg bg-muted p-1">
            <button onClick={() => setMode('login')} className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Entrar</button>
            <button onClick={() => setMode('register')} className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Criar conta</button>
          </div>
          {mode === 'register' && (
            <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" /></div>
          )}
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" /></div>
          <div><Label>Senha</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button onClick={submit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Mail className="mr-2 h-4 w-4" /> {mode === 'login' ? 'Entrar com e-mail' : 'Criar conta'}
          </Button>
          <div className="relative py-1"><Separator /><span className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-fit bg-card px-2 text-[10px] uppercase text-muted-foreground">ou</span></div>
          <Button variant="outline" onClick={googleSignIn} disabled={loading} className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </Button>
          <p className="pt-2 text-center text-[11px] text-muted-foreground">Dica: pressione <kbd className="rounded border px-1 py-0.5 text-[10px]">Ctrl</kbd>+<kbd className="rounded border px-1 py-0.5 text-[10px]">A</kbd> para modo Admin</p>
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ icon: Icon, label, value, accent = 'emerald', hint }) {
  const map = { emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400', blue: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400', amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400', violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400' }
  return (<Card className="overflow-hidden border-border/60"><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div><div className={`rounded-xl bg-gradient-to-br p-3 ${map[accent]}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>)
}

function ProductForm({ initial, onSave, onClose }) {
  const [p, setP] = useState(() => initial || {
    name: '', code: '', price: 0, description: '', quantity: 0, unit: 'un',
    category: 'Matéria-Prima', codeKey: 'A', lot: '', supplier: '',
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    location: '', imageUrl: '', requiresRefrigeration: false,
  })
  const submit = async () => {
    if (!p.name.trim()) { toast.error('Nome é obrigatório'); return }
    await onSave({ ...p, expiresAt: new Date(p.expiresAt).toISOString() })
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Nome do produto</Label><Input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></div>
      <div><Label>Código</Label><Input value={p.code} onChange={e => setP({ ...p, code: e.target.value })} placeholder="MP001" /></div>
      <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={p.price} onChange={e => setP({ ...p, price: e.target.value })} /></div>
      <div><Label>Quantidade</Label><Input type="number" value={p.quantity} onChange={e => setP({ ...p, quantity: e.target.value })} /></div>
      <div><Label>Unidade</Label><Input value={p.unit} onChange={e => setP({ ...p, unit: e.target.value })} placeholder="kg, un, L" /></div>
      <div><Label>Categoria</Label><Select value={p.category} onValueChange={v => setP({ ...p, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Código-Chave</Label><Select value={p.codeKey} onValueChange={v => setP({ ...p, codeKey: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CODE_KEYS.map(c => <SelectItem key={c} value={c}>Código {c}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Fornecedor</Label><Input value={p.supplier || ''} onChange={e => setP({ ...p, supplier: e.target.value })} /></div>
      <div><Label>Lote</Label><Input value={p.lot} onChange={e => setP({ ...p, lot: e.target.value })} /></div>
      <div><Label>Validade</Label><Input type="date" value={String(p.expiresAt).slice(0, 10)} onChange={e => setP({ ...p, expiresAt: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Localização (eco-localização)</Label><Input value={p.location} onChange={e => setP({ ...p, location: e.target.value })} placeholder="Corredor A - Prateleira 1" /></div>
      <div className="sm:col-span-2"><Label>URL da imagem</Label><Input value={p.imageUrl} onChange={e => setP({ ...p, imageUrl: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={p.description} onChange={e => setP({ ...p, description: e.target.value })} /></div>
      <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <div><p className="text-sm font-medium">Refrigeração obrigatória</p><p className="text-xs text-muted-foreground">Ative para produtos como leite, queijos, presunto etc.</p></div>
        <Switch checked={!!p.requiresRefrigeration} onCheckedChange={v => setP({ ...p, requiresRefrigeration: v })} />
      </div>
      <div className="sm:col-span-2 mt-2 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button></div>
    </div>
  )
}

function ColorInput({ label, value, onChange }) {
  return (<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-md border" style={{ background: value }} /><span className="text-sm font-medium">{label}</span></div><input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded border bg-transparent" /></div>)
}

function Dashboard({ analytics, criticalCount }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Package} label="Produtos cadastrados" value={analytics?.totalProducts ?? '-'} accent="emerald" />
        <KPI icon={Boxes} label="Unidades em estoque" value={analytics?.totalStock ?? '-'} accent="blue" />
        <KPI icon={TrendingUp} label="Valor total" value={currency(analytics?.totalValue || 0)} accent="violet" />
        <KPI icon={AlertTriangle} label="Alertas FEFO" value={criticalCount} accent="amber" hint="Críticos + vencidos" />
      </div>
      <Card className="border-border/60"><CardHeader className="pb-2"><CardTitle className="text-base">Movimentação de estoque (30 dias)</CardTitle><CardDescription>Entradas × Saídas diárias</CardDescription></CardHeader>
        <CardContent><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}><defs><linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tickFormatter={v => v.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Area type="monotone" dataKey="entrada" stroke="#10b981" fill="url(#gIn)" strokeWidth={2} /><Area type="monotone" dataKey="saida" stroke="#f43f5e" fill="url(#gOut)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-600/15 p-2.5 text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-5 w-5" /></div><div><p className="text-sm font-semibold">Projeção de demanda mensal</p><p className="text-xs text-muted-foreground">Baseado na mediana de saídas dos últimos 30 dias — resistente a picos.</p></div></div><div className="text-right"><p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{analytics?.projectedMonthly ?? 0}</p><p className="text-xs text-muted-foreground">unidades / próximo mês</p></div></CardContent></Card>
    </div>
  )
}

function SanitaryTab() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const load = async () => { const r = await api('/sanitary'); setItems(await r.json()) }
  useEffect(() => { load() }, [])
  const save = async (data) => {
    const method = editing?.id ? 'PUT' : 'POST'
    const url = editing?.id ? `/sanitary/${editing.id}` : '/sanitary'
    await api(url, { method, body: JSON.stringify(data) })
    toast.success('Vigilância salva'); setOpen(false); setEditing(null); load()
  }
  const del = async (id) => { if (!confirm('Remover?')) return; await api(`/sanitary/${id}`, { method: 'DELETE' }); load() }
  const riskColor = { 'Alto': 'bg-red-500/10 text-red-600 border-red-500/30', 'Médio': 'bg-amber-500/10 text-amber-600 border-amber-500/30', 'Baixo': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Vigilância Sanitária</h2><Button onClick={() => { setEditing({ product:'', requirement:'', temperature:'', risk:'Médio', action:'' }); setOpen(true) }} size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-4 w-4" /> Novo</Button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(s => (
          <Card key={s.id} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold text-sm">{s.product}</h3><div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant="outline" className={`text-[10px] ${riskColor[s.risk] || ''}`}>Risco {s.risk}</Badge><Badge variant="secondary" className="text-[10px]"><Thermometer className="mr-1 h-2.5 w-2.5" />{s.temperature}</Badge></div></div>
                <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setOpen(true) }}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
              <div><p className="text-[11px] font-semibold uppercase text-muted-foreground mt-1">Exigência</p><p className="text-xs leading-relaxed">{s.requirement}</p></div>
              <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Ação recomendada</p><p className="text-xs leading-relaxed">{s.action}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Novo'} item de vigilância</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Produto</Label><Input value={editing.product} onChange={e => setEditing({...editing, product: e.target.value})} /></div>
              <div><Label>Temperatura ideal</Label><Input value={editing.temperature} onChange={e => setEditing({...editing, temperature: e.target.value})} /></div>
              <div><Label>Nível de risco</Label><Select value={editing.risk} onValueChange={v => setEditing({...editing, risk: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Baixo','Médio','Alto'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Exigência sanitária</Label><Textarea rows={4} value={editing.requirement} onChange={e => setEditing({...editing, requirement: e.target.value})} /></div>
              <div><Label>Ação recomendada</Label><Textarea rows={3} value={editing.action} onChange={e => setEditing({...editing, action: e.target.value})} /></div>
              <Button onClick={() => save(editing)} className="w-full bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExcelTab({ reload }) {
  const inputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const doExport = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/excel/export', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return toast.error('Falha ao exportar')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `sinergia_export_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url); toast.success('Excel exportado!')
  }
  const doImport = async (file) => {
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const b64 = 'data:xlsx;base64,' + btoa(String.fromCharCode(...new Uint8Array(buf)))
      const res = await api('/excel/import', { method: 'POST', body: JSON.stringify({ file: b64 }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.imported} produtos importados da aba "${data.sheet}"`)
      reload()
    } catch (e) { toast.error(e.message) } finally { setImporting(false); if (inputRef.current) inputRef.current.value = '' }
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Importar / Exportar Excel</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-border/60"><CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3"><div className="rounded-lg bg-blue-500/15 p-2.5 text-blue-600"><Upload className="h-5 w-5" /></div><div><h3 className="font-semibold">Importar planilha</h3><p className="text-xs text-muted-foreground">Envie um .xlsx — detectamos colunas automaticamente (Código, Nome, Categoria, Estoque, Custo, Fornecedor, Corredor, Prateleira, Validade).</p></div></div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} className="hidden" />
          <Button onClick={() => inputRef.current?.click()} disabled={importing} className="w-full">{importing ? 'Importando...' : 'Selecionar arquivo .xlsx'}</Button>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-500/15 p-2.5 text-emerald-600"><Download className="h-5 w-5" /></div><div><h3 className="font-semibold">Exportar dados</h3><p className="text-xs text-muted-foreground">Baixa um Excel com 3 abas: Produtos, Movimentações e Vigilância Sanitária.</p></div></div>
          <Button onClick={doExport} className="w-full bg-emerald-600 hover:bg-emerald-700"><Download className="mr-2 h-4 w-4" /> Baixar Excel</Button>
        </CardContent></Card>
      </div>
    </div>
  )
}

function TeamTab({ user }) {
  const [teams, setTeams] = useState([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [addForm, setAddForm] = useState({})
  const load = async () => { const r = await api('/teams'); if (r.ok) setTeams(await r.json()) }
  useEffect(() => { load() }, [])
  const createTeam = async () => {
    if (!newName) return
    await api('/teams', { method: 'POST', body: JSON.stringify({ name: newName }) })
    setNewName(''); setCreating(false); toast.success('Equipe criada'); load()
  }
  const addMember = async (teamId) => {
    const f = addForm[teamId] || {}
    if (!f.name || !f.email) return toast.error('Nome e e-mail obrigatórios')
    await api(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(f) })
    setAddForm({ ...addForm, [teamId]: {} }); toast.success('Membro adicionado'); load()
  }
  const rmMember = async (teamId, mid) => { await api(`/teams/${teamId}/members/${mid}`, { method: 'DELETE' }); load() }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /> Equipe</h2><Button size="sm" onClick={() => setCreating(!creating)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-4 w-4" /> Nova equipe</Button></div>
      {creating && (
        <Card className="border-border/60"><CardContent className="p-4 flex gap-2"><Input placeholder="Nome da equipe" value={newName} onChange={e => setNewName(e.target.value)} /><Button onClick={createTeam}>Criar</Button></CardContent></Card>
      )}
      {teams.length === 0 && !creating && <p className="text-center text-sm text-muted-foreground py-10">Nenhuma equipe. Crie a primeira!</p>}
      {teams.map(t => (
        <Card key={t.id} className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t.name}</CardTitle><CardDescription>{t.members?.length || 0} membros</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {t.members?.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5">
                <div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">{m.name[0]?.toUpperCase()}</div><div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email} · {m.role}</p></div></div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rmMember(t.id, m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <Input placeholder="Nome" value={addForm[t.id]?.name || ''} onChange={e => setAddForm({ ...addForm, [t.id]: { ...(addForm[t.id]||{}), name: e.target.value } })} />
              <Input placeholder="E-mail" value={addForm[t.id]?.email || ''} onChange={e => setAddForm({ ...addForm, [t.id]: { ...(addForm[t.id]||{}), email: e.target.value } })} />
              <Select value={addForm[t.id]?.role || 'operador'} onValueChange={v => setAddForm({ ...addForm, [t.id]: { ...(addForm[t.id]||{}), role: v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['operador','gerente','estoquista','auditor'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              <Button onClick={() => addMember(t.id)}><UserPlus className="mr-1 h-4 w-4" /> Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AdminModal({ open, onClose }) {
  const [step, setStep] = useState('pwd')
  const [pwd, setPwd] = useState('')
  const [users, setUsers] = useState([])
  const [adminToken, setAdminToken] = useState('')

  useEffect(() => { if (!open) { setStep('pwd'); setPwd(''); setUsers([]); setAdminToken('') } }, [open])

  const unlock = async () => {
    const res = await fetch('/api/admin/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || 'Senha incorreta')
    setAdminToken(data.token); setStep('panel')
    const r = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${data.token}` } })
    setUsers(await r.json())
    toast.success('Modo Admin ativado')
  }
  const toggle = async (id) => {
    const r = await fetch('/api/admin/toggle-block', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ userId: id }) })
    if (!r.ok) return toast.error('Falha')
    const r2 = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminToken}` } })
    setUsers(await r2.json()); toast.success('Status alterado')
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-500" /> Modo Admin Sinergia</DialogTitle><DialogDescription>Área restrita. Acesso apenas para administração da Sinergia.</DialogDescription></DialogHeader>
        {step === 'pwd' ? (
          <div className="space-y-3">
            <Label>Senha de administrador</Label>
            <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && unlock()} placeholder="••••••••••" />
            <Button onClick={unlock} className="w-full bg-amber-600 hover:bg-amber-700"><Unlock className="mr-2 h-4 w-4" /> Desbloquear Modo Admin</Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">Total: {users.length} contas. Bloqueie clientes que não estão pagando o pacote.</p>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div><p className="text-sm font-medium">{u.name} {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] ml-1">admin</Badge>}</p><p className="text-xs text-muted-foreground">{u.email} · {u.provider}</p></div>
                <div className="flex items-center gap-2">
                  {u.blocked ? <Badge className="bg-red-600">Bloqueado</Badge> : <Badge className="bg-emerald-600">Ativo</Badge>}
                  <Button size="sm" variant={u.blocked ? 'default' : 'destructive'} onClick={() => toggle(u.id)}>{u.blocked ? <><Unlock className="mr-1 h-3.5 w-3.5"/>Desbloquear</> : <><Ban className="mr-1 h-3.5 w-3.5"/>Bloquear</>}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [products, setProducts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [settings, setSettings] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [codeFilter, setCodeFilter] = useState('all')
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [openMove, setOpenMove] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  // Auth init
  useEffect(() => {
    const t = localStorage.getItem('token'); const u = localStorage.getItem('user')
    if (t && u) {
      try { setUser(JSON.parse(u)) } catch {}
      // validate
      api('/auth/me').then(async r => {
        if (!r.ok) { localStorage.clear(); setUser(null) }
        setAuthChecked(true)
      })
    } else setAuthChecked(true)
  }, [])

  // Ctrl+A keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        setAdminOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadAll = useCallback(async () => {
    const [pR, aR, sR] = await Promise.all([api('/products'), api('/analytics/summary'), api('/settings/fefo')])
    setProducts(await pR.json()); setAnalytics(await aR.json()); setSettings(await sR.json())
  }, [])

  useEffect(() => { if (user) loadAll() }, [user, loadAll])

  const saveProduct = async (payload) => {
    const url = editing ? `/products/${editing.id}` : '/products'
    const method = editing ? 'PUT' : 'POST'
    const r = await api(url, { method, body: JSON.stringify(payload) })
    if (!r.ok) return toast.error('Falha ao salvar')
    toast.success(editing ? 'Atualizado' : 'Criado'); setOpenForm(false); setEditing(null); loadAll()
  }
  const deleteProduct = async (id) => { if (!confirm('Excluir?')) return; await api(`/products/${id}`, { method: 'DELETE' }); toast.success('Removido'); loadAll() }
  const registerMovement = async (product, type, quantity) => {
    const r = await api('/movements', { method: 'POST', body: JSON.stringify({ productId: product.id, type, quantity: Number(quantity) }) })
    if (r.ok) { toast.success(`${type === 'in' ? 'Entrada' : 'Saída'} registrada`); setOpenMove(null); loadAll() } else toast.error('Falha')
  }
  const saveFefoColors = async (patch) => {
    const r = await api('/settings/fefo', { method: 'PUT', body: JSON.stringify({ ...settings, ...patch }) })
    setSettings(await r.json())
  }
  const logout = () => { localStorage.clear(); setUser(null); toast.success('Sessão encerrada') }

  const filtered = useMemo(() => (products || []).filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter !== 'all' && p.category !== catFilter) return false
    if (codeFilter !== 'all' && p.codeKey !== codeFilter) return false
    return true
  }), [products, search, catFilter, codeFilter])
  const fefoSorted = useMemo(() => [...filtered].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)), [filtered])
  const bucketColor = (b) => settings?.[b] || '#888'
  const criticalCount = useMemo(() => products.filter(p => { const b = fefoBucket(p, settings); return b === 'critical' || b === 'expired' }).length, [products, settings])

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
  if (!user) return <><Toaster richColors position="top-right" /><LoginScreen onAuth={setUser} /><AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} /></>

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm"><Sparkles className="h-5 w-5" /></div>
            <div><h1 className="text-base font-bold leading-tight sm:text-lg">Sinergia</h1><p className="hidden text-[11px] text-muted-foreground sm:block">Olá, {user.name}</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => { setEditing(null); setOpenForm(true) }} size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Novo produto</span><span className="sm:hidden">Novo</span></Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={logout} title="Trocar de conta"><LogOut className="h-4 w-4" /></Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 mb-5 h-auto">
            <TabsTrigger value="dashboard" className="gap-1 flex-col sm:flex-row py-2"><LayoutDashboard className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Dashboard</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1 flex-col sm:flex-row py-2"><PackageOpen className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Produtos</span></TabsTrigger>
            <TabsTrigger value="fefo" className="gap-1 flex-col sm:flex-row py-2"><CalendarClock className="h-4 w-4" /><span className="text-[10px] sm:text-sm">FEFO</span></TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 flex-col sm:flex-row py-2"><LineChartIcon className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Análise</span></TabsTrigger>
            <TabsTrigger value="sanitary" className="gap-1 flex-col sm:flex-row py-2"><ShieldCheck className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Vigilância</span></TabsTrigger>
            <TabsTrigger value="excel" className="gap-1 flex-col sm:flex-row py-2"><FileSpreadsheet className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Excel</span></TabsTrigger>
            <TabsTrigger value="team" className="gap-1 flex-col sm:flex-row py-2"><Users className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Equipe</span></TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><Dashboard analytics={analytics} criticalCount={criticalCount} /></TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card className="border-border/60"><CardContent className="grid gap-3 p-4 sm:grid-cols-4">
              <div className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" /></div>
              <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas categorias</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              <Select value={codeFilter} onValueChange={setCodeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos códigos</SelectItem>{CODE_KEYS.map(c => <SelectItem key={c} value={c}>Código {c}</SelectItem>)}</SelectContent></Select>
            </CardContent></Card>
            {filtered.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(p => {
                  const b = fefoBucket(p, settings); const dLeft = daysUntil(p.expiresAt)
                  return (
                    <Card key={p.id} className="group overflow-hidden border-border/60 transition hover:shadow-md">
                      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                        {p.imageUrl ? (<img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />) : (<div className="flex h-full w-full items-center justify-center text-muted-foreground"><Package className="h-10 w-10 opacity-40" /></div>)}
                        <div className="absolute right-2 top-2 flex gap-1.5"><Badge className="bg-black/60 text-white hover:bg-black/60 text-[10px]">Cód. {p.codeKey}</Badge>{p.code && <Badge variant="outline" className="bg-white/80 text-[10px]">{p.code}</Badge>}</div>
                        <div className="absolute left-2 top-2"><span className="inline-block h-4 w-4 rounded-full ring-2 ring-white/80 shadow" style={{ background: bucketColor(b) }} /></div>
                      </div>
                      <CardContent className="p-3.5">
                        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{p.name}</h3><p className="text-xs text-muted-foreground">{p.category}</p></div><span className="text-sm font-bold text-emerald-600 whitespace-nowrap">{currency(p.price)}</span></div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Estoque: <b className="text-foreground">{p.quantity} {p.unit || ''}</b></span><span>{dLeft >= 0 ? `${dLeft}d p/ vencer` : `Vencido há ${-dLeft}d`}</span></div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /><span className="truncate">{p.location}</span></div>
                        <Separator className="my-3" />
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setOpenMove({ product: p, type: 'in' })}><ArrowDownToLine className="mr-1 h-3.5 w-3.5" /> Entrada</Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setOpenMove({ product: p, type: 'out' })}><ArrowUpFromLine className="mr-1 h-3.5 w-3.5" /> Saída</Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setOpenForm(true) }}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fefo" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" /> Roleta de cores FEFO</CardTitle><CardDescription>Customize as cores para inclusão de daltônicos. Ajuste também os limiares de dias.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <ColorInput label="Status Seguro" value={settings?.safe || '#10b981'} onChange={v => saveFefoColors({ safe: v })} />
                  <ColorInput label="Status Atenção" value={settings?.warning || '#f59e0b'} onChange={v => saveFefoColors({ warning: v })} />
                  <ColorInput label="Status Crítico" value={settings?.critical || '#ef4444'} onChange={v => saveFefoColors({ critical: v })} />
                  <ColorInput label="Status Vencido" value={settings?.expired || '#6b7280'} onChange={v => saveFefoColors({ expired: v })} />
                </div>
                <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div><div className="mb-2 flex items-center justify-between text-sm"><Label>Atenção a partir de</Label><span className="font-mono text-xs">{settings?.thresholdWarningDays ?? 30} dias</span></div><Slider value={[settings?.thresholdWarningDays ?? 30]} min={7} max={90} step={1} onValueChange={v => setSettings({ ...settings, thresholdWarningDays: v[0] })} onValueCommit={v => saveFefoColors({ thresholdWarningDays: v[0] })} /></div>
                  <div><div className="mb-2 flex items-center justify-between text-sm"><Label>Crítico a partir de</Label><span className="font-mono text-xs">{settings?.thresholdCriticalDays ?? 7} dias</span></div><Slider value={[settings?.thresholdCriticalDays ?? 7]} min={1} max={30} step={1} onValueChange={v => setSettings({ ...settings, thresholdCriticalDays: v[0] })} onValueCommit={v => saveFefoColors({ thresholdCriticalDays: v[0] })} /></div>
                  <p className="text-xs text-muted-foreground">As cores são aplicadas em todo o app sem depender de rótulos textuais.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Fila FEFO — First Expire, First Out</CardTitle><CardDescription>Produtos ordenados pela validade mais próxima. Localização de lote incluída.</CardDescription></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                  {fefoSorted.map(p => {
                    const b = fefoBucket(p, settings); const d = daysUntil(p.expiresAt)
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-9 w-9 shrink-0 rounded-md" style={{ background: bucketColor(b) }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-medium">{p.name}</p><Badge variant="outline" className="text-[10px]">Cód. {p.codeKey}</Badge>{p.requiresRefrigeration && <Badge variant="secondary" className="text-[10px]"><Thermometer className="mr-0.5 h-2.5 w-2.5"/>Refrigerar</Badge>}</div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Lote {p.lot} • {p.location}</p>
                        </div>
                        <div className="text-right"><p className="text-sm font-semibold">{p.quantity} {p.unit || 'un'}</p><p className="text-xs text-muted-foreground">{d >= 0 ? `${d} dias` : `Vencido ${-d}d`}</p></div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-border/60"><CardHeader className="pb-2"><CardTitle className="text-base">Entradas × Saídas por dia</CardTitle><CardDescription>Visualização em barras dos últimos 30 dias.</CardDescription></CardHeader>
              <CardContent><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="date" tickFormatter={v => v.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="saida" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/60"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Mediana diária de saídas</p><p className="mt-1 text-3xl font-bold">{analytics?.medianDailyOut ?? 0} un.</p><p className="mt-1 text-xs text-muted-foreground">Medida robusta que ignora outliers.</p></CardContent></Card>
              <Card className="border-emerald-500/30"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Projeção mensal</p><p className="mt-1 text-3xl font-bold text-emerald-600">{analytics?.projectedMonthly ?? 0} un.</p><p className="mt-1 text-xs text-muted-foreground">Mediana × 30 dias.</p></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="sanitary"><SanitaryTab /></TabsContent>
          <TabsContent value="excel"><ExcelTab reload={loadAll} /></TabsContent>
          <TabsContent value="team"><TeamTab user={user} /></TabsContent>
        </Tabs>
      </main>

      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle></DialogHeader>
          <ProductForm initial={editing} onSave={saveProduct} onClose={() => { setOpenForm(false); setEditing(null) }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!openMove} onOpenChange={(v) => { if (!v) setOpenMove(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{openMove?.type === 'in' ? 'Registrar entrada' : 'Registrar saída'}</DialogTitle><DialogDescription>{openMove?.product?.name}</DialogDescription></DialogHeader>
          <MoveForm onSubmit={(q) => registerMovement(openMove.product, openMove.type, q)} type={openMove?.type} />
        </DialogContent>
      </Dialog>

      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  )
}

function MoveForm({ onSubmit, type }) {
  const [q, setQ] = useState(1)
  return (<div className="space-y-3"><div><Label>Quantidade</Label><Input type="number" min="1" value={q} onChange={e => setQ(e.target.value)} /></div><Button className={`w-full ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`} onClick={() => onSubmit(q)}>{type === 'in' ? 'Confirmar entrada' : 'Confirmar saída'}</Button></div>)
}
