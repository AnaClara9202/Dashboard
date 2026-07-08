'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Package, Boxes, TrendingUp, AlertTriangle, Plus, Search, Sun, Moon,
  LayoutDashboard, PackageOpen, CalendarClock, LineChart as LineChartIcon,
  Edit3, Trash2, ArrowDownToLine, ArrowUpFromLine, MapPin, Palette,
  Filter, X, Sparkles,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { toast, Toaster } from 'sonner'

const CATEGORIES = ['Matéria-Prima', 'Produto Final', 'Embalagem', 'Insumo', 'Outros']
const CODE_KEYS = ['A', 'B', 'C']

const currency = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const daysUntil = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

function fefoBucket(product, settings) {
  const d = daysUntil(product.expiresAt)
  if (d < 0) return 'expired'
  if (d <= (settings?.thresholdCriticalDays ?? 7)) return 'critical'
  if (d <= (settings?.thresholdWarningDays ?? 30)) return 'warning'
  return 'safe'
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Button variant="outline" size="icon" className="h-9 w-9" />
  return (
    <Button variant="outline" size="icon" className="h-9 w-9"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function KPI({ icon: Icon, label, value, accent = 'emerald', hint }) {
  const map = {
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
  }
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={`rounded-xl bg-gradient-to-br p-3 ${map[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductForm({ initial, onSave, onClose }) {
  const [p, setP] = useState(() => initial || {
    name: '', price: 0, description: '', quantity: 0,
    category: 'Matéria-Prima', codeKey: 'A', lot: '',
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    location: '', imageUrl: '', requiresRefrigeration: false,
  })

  const submit = async () => {
    if (!p.name.trim()) { toast.error('Nome é obrigatório'); return }
    const payload = { ...p, expiresAt: new Date(p.expiresAt).toISOString() }
    await onSave(payload)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Nome do produto</Label>
        <Input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} placeholder="Ex.: Leite Integral 1L" />
      </div>
      <div>
        <Label>Preço (R$)</Label>
        <Input type="number" step="0.01" value={p.price} onChange={e => setP({ ...p, price: e.target.value })} />
      </div>
      <div>
        <Label>Quantidade</Label>
        <Input type="number" value={p.quantity} onChange={e => setP({ ...p, quantity: e.target.value })} />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select value={p.category} onValueChange={v => setP({ ...p, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Código-Chave</Label>
        <Select value={p.codeKey} onValueChange={v => setP({ ...p, codeKey: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CODE_KEYS.map(c => <SelectItem key={c} value={c}>Código {c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Lote</Label>
        <Input value={p.lot} onChange={e => setP({ ...p, lot: e.target.value })} placeholder="Ex.: L2026-001" />
      </div>
      <div>
        <Label>Validade</Label>
        <Input type="date" value={String(p.expiresAt).slice(0, 10)} onChange={e => setP({ ...p, expiresAt: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label>Localização do lote (eco-localização)</Label>
        <Input value={p.location} onChange={e => setP({ ...p, location: e.target.value })} placeholder="Ex.: Câmara Fria - Prateleira A1" />
      </div>
      <div className="sm:col-span-2">
        <Label>URL da imagem</Label>
        <Input value={p.imageUrl} onChange={e => setP({ ...p, imageUrl: e.target.value })} placeholder="https://..." />
      </div>
      <div className="sm:col-span-2">
        <Label>Descrição</Label>
        <Textarea rows={3} value={p.description} onChange={e => setP({ ...p, description: e.target.value })} />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <div>
          <p className="text-sm font-medium">Refrigeração obrigatória</p>
          <p className="text-xs text-muted-foreground">Ative para produtos como leite e derivados.</p>
        </div>
        <Switch checked={!!p.requiresRefrigeration} onCheckedChange={v => setP({ ...p, requiresRefrigeration: v })} />
      </div>
      <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
      </div>
    </div>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md border" style={{ background: value }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="h-9 w-14 cursor-pointer rounded border bg-transparent" />
    </div>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [codeFilter, setCodeFilter] = useState('all')

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [openMove, setOpenMove] = useState(null) // {product, type}

  const loadAll = async () => {
    try {
      const [pRes, mRes, aRes, sRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/movements').then(r => r.json()),
        fetch('/api/analytics/summary').then(r => r.json()),
        fetch('/api/settings/fefo').then(r => r.json()),
      ])
      setProducts(pRes || [])
      setMovements(mRes || [])
      setAnalytics(aRes)
      setSettings(sRes)
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const saveProduct = async (payload) => {
    try {
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Falha ao salvar')
      toast.success(editing ? 'Produto atualizado' : 'Produto criado')
      setOpenForm(false); setEditing(null)
      loadAll()
    } catch (e) { toast.error(e.message) }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Excluir este produto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    toast.success('Produto removido')
    loadAll()
  }

  const registerMovement = async (product, type, quantity) => {
    const res = await fetch('/api/movements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, type, quantity: Number(quantity) })
    })
    if (res.ok) {
      toast.success(`${type === 'in' ? 'Entrada' : 'Saída'} de ${quantity} unid. registrada`)
      setOpenMove(null)
      loadAll()
    } else toast.error('Falha ao registrar movimento')
  }

  const saveFefoColors = async (patch) => {
    const res = await fetch('/api/settings/fefo', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, ...patch })
    })
    const s = await res.json()
    setSettings(s)
  }

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter !== 'all' && p.category !== catFilter) return false
      if (codeFilter !== 'all' && p.codeKey !== codeFilter) return false
      return true
    })
  }, [products, search, catFilter, codeFilter])

  const fefoSorted = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
  }, [filtered])

  const bucketColor = (b) => {
    if (!settings) return '#888'
    return settings[b] || '#888'
  }

  const criticalCount = useMemo(() => products.filter(p => {
    const b = fefoBucket(p, settings); return b === 'critical' || b === 'expired'
  }).length, [products, settings])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">Sinergia</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">Controle inteligente de estoque</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setEditing(null); setOpenForm(true) }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Novo produto</span><span className="sm:hidden">Novo</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-5">
            <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><PackageOpen className="h-4 w-4" /><span className="hidden sm:inline">Produtos</span></TabsTrigger>
            <TabsTrigger value="fefo" className="gap-1.5"><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">FEFO</span></TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><LineChartIcon className="h-4 w-4" /><span className="hidden sm:inline">Análise</span></TabsTrigger>
          </TabsList>

          {/* -------- DASHBOARD -------- */}
          <TabsContent value="dashboard" className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KPI icon={Package} label="Produtos cadastrados" value={analytics?.totalProducts ?? '-'} accent="emerald" />
              <KPI icon={Boxes} label="Unidades em estoque" value={analytics?.totalStock ?? '-'} accent="blue" />
              <KPI icon={TrendingUp} label="Valor total" value={currency(analytics?.totalValue || 0)} accent="violet" />
              <KPI icon={AlertTriangle} label="Alertas FEFO" value={criticalCount} accent="amber" hint="Críticos + vencidos" />
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Movimentação de estoque (30 dias)</CardTitle>
                    <CardDescription>Entradas × Saídas diárias</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tickFormatter={v => v.slice(5)} fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="entrada" stroke="#10b981" fill="url(#gIn)" strokeWidth={2} />
                      <Area type="monotone" dataKey="saida" stroke="#f43f5e" fill="url(#gOut)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-600/15 p-2.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Projeção de demanda mensal</p>
                    <p className="text-xs text-muted-foreground">Baseado na mediana de saídas dos últimos 30 dias — resistente a picos.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{analytics?.projectedMonthly ?? 0}</p>
                  <p className="text-xs text-muted-foreground">unidades / próximo mês</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- PRODUCTS -------- */}
          <TabsContent value="products" className="space-y-4">
            <Card className="border-border/60">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
                </div>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={codeFilter} onValueChange={setCodeFilter}>
                  <SelectTrigger><SelectValue placeholder="Código" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos códigos</SelectItem>
                    {CODE_KEYS.map(c => <SelectItem key={c} value={c}>Código {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando produtos...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(p => {
                  const b = fefoBucket(p, settings)
                  const dLeft = daysUntil(p.expiresAt)
                  return (
                    <Card key={p.id} className="group overflow-hidden border-border/60 transition hover:shadow-md">
                      <div className="relative h-36 w-full overflow-hidden bg-muted">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-10 w-10 opacity-40" />
                          </div>
                        )}
                        <div className="absolute right-2 top-2 flex gap-1.5">
                          <Badge className="bg-black/60 text-white hover:bg-black/60">Cód. {p.codeKey}</Badge>
                        </div>
                        <div className="absolute left-2 top-2">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow"
                            style={{ background: bucketColor(b) }}>
                            {b === 'expired' ? 'Vencido' : b === 'critical' ? 'Crítico' : b === 'warning' ? 'Atenção' : 'OK'}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                            <p className="text-xs text-muted-foreground">{p.category}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{currency(p.price)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Estoque: <b className="text-foreground">{p.quantity}</b></span>
                          <span>{dLeft >= 0 ? `${dLeft}d p/ vencer` : `Vencido há ${-dLeft}d`}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> <span className="truncate">{p.location}</span>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setOpenMove({ product: p, type: 'in' })}>
                            <ArrowDownToLine className="mr-1 h-3.5 w-3.5" /> Entrada
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setOpenMove({ product: p, type: 'out' })}>
                            <ArrowUpFromLine className="mr-1 h-3.5 w-3.5" /> Saída
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setOpenForm(true) }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* -------- FEFO -------- */}
          <TabsContent value="fefo" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" /> Roleta de cores FEFO</CardTitle>
                    <CardDescription>Customize as cores para inclusão de daltônicos. Ajuste também os limiares de dias.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <ColorInput label="Status Seguro" value={settings?.safe || '#10b981'} onChange={v => saveFefoColors({ safe: v })} />
                  <ColorInput label="Status Atenção" value={settings?.warning || '#f59e0b'} onChange={v => saveFefoColors({ warning: v })} />
                  <ColorInput label="Status Crítico" value={settings?.critical || '#ef4444'} onChange={v => saveFefoColors({ critical: v })} />
                  <ColorInput label="Status Vencido" value={settings?.expired || '#6b7280'} onChange={v => saveFefoColors({ expired: v })} />
                </div>
                <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <Label>Atenção a partir de</Label>
                      <span className="font-mono text-xs">{settings?.thresholdWarningDays ?? 30} dias</span>
                    </div>
                    <Slider value={[settings?.thresholdWarningDays ?? 30]} min={7} max={90} step={1}
                      onValueChange={v => setSettings({ ...settings, thresholdWarningDays: v[0] })}
                      onValueCommit={v => saveFefoColors({ thresholdWarningDays: v[0] })} />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <Label>Crítico a partir de</Label>
                      <span className="font-mono text-xs">{settings?.thresholdCriticalDays ?? 7} dias</span>
                    </div>
                    <Slider value={[settings?.thresholdCriticalDays ?? 7]} min={1} max={30} step={1}
                      onValueChange={v => setSettings({ ...settings, thresholdCriticalDays: v[0] })}
                      onValueCommit={v => saveFefoColors({ thresholdCriticalDays: v[0] })} />
                  </div>
                  <p className="text-xs text-muted-foreground">💡 As cores são aplicadas em todo o app sem depender de rótulos textuais.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fila FEFO — First Expire, First Out</CardTitle>
                <CardDescription>Produtos ordenados pela validade mais próxima. Localização de lote incluída.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {fefoSorted.map(p => {
                    const b = fefoBucket(p, settings)
                    const d = daysUntil(p.expiresAt)
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-9 w-9 shrink-0 rounded-md" style={{ background: bucketColor(b) }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <Badge variant="outline" className="text-[10px]">Cód. {p.codeKey}</Badge>
                            {p.requiresRefrigeration && <Badge variant="secondary" className="text-[10px]">Refrigerar</Badge>}
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> Lote {p.lot} • {p.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{p.quantity} un.</p>
                          <p className="text-xs text-muted-foreground">{d >= 0 ? `${d} dias` : `Vencido ${-d}d`}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- ANALYTICS -------- */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Entradas × Saídas por dia</CardTitle>
                <CardDescription>Visualização em barras dos últimos 30 dias.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.series || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tickFormatter={v => v.slice(5)} fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saida" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/60">
                <CardContent className="p-5">
                  <p className="text-xs uppercase text-muted-foreground">Mediana diária de saídas</p>
                  <p className="mt-1 text-3xl font-bold">{analytics?.medianDailyOut ?? 0} un.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Medida robusta que ignora outliers.</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/30">
                <CardContent className="p-5">
                  <p className="text-xs uppercase text-muted-foreground">Projeção mensal</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">{analytics?.projectedMonthly ?? 0} un.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Mediana × 30 dias.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Product Form Dialog */}
      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <DialogDescription>Preencha os campos para {editing ? 'atualizar' : 'adicionar'} um item ao estoque.</DialogDescription>
          </DialogHeader>
          <ProductForm initial={editing} onSave={saveProduct} onClose={() => { setOpenForm(false); setEditing(null) }} />
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={!!openMove} onOpenChange={(v) => { if (!v) setOpenMove(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{openMove?.type === 'in' ? 'Registrar entrada' : 'Registrar saída'}</DialogTitle>
            <DialogDescription>{openMove?.product?.name}</DialogDescription>
          </DialogHeader>
          <MoveForm onSubmit={(q) => registerMovement(openMove.product, openMove.type, q)} type={openMove?.type} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MoveForm({ onSubmit, type }) {
  const [q, setQ] = useState(1)
  return (
    <div className="space-y-3">
      <div>
        <Label>Quantidade</Label>
        <Input type="number" min="1" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <Button className={`w-full ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
        onClick={() => onSubmit(q)}>
        {type === 'in' ? 'Confirmar entrada' : 'Confirmar saída'}
      </Button>
    </div>
  )
}
