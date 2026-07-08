import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const uri = process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'sinergia'
const JWT_SECRET = process.env.JWT_SECRET || 'sinergia-dev-secret-2026'

let cachedClient = null
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }
  return cachedClient.db(dbName)
}

const json = (data, init = {}) => NextResponse.json(data, init)
const err = (msg, status = 500) => json({ error: msg }, { status })

const SANITARY_SEED = [
  { product: 'Leite Integral', requirement: 'Refrigeração obrigatória entre 1°C e 4°C. Monitorar temperatura 3x ao dia (entrada, meio e fim do expediente). Não manter fora da câmara por mais de 30 minutos. Verificar integridade da embalagem e data de validade antes de cada uso. Caixas abertas devem ser consumidas em até 24h.', temperature: 'Câmara Fria (1–4°C)', risk: 'Alto', action: 'Manter termômetro digital na câmara. Registrar temperaturas em planilha de controle. Descartar imediatamente se temperatura > 10°C por mais de 2h. Não recongelar após descongelamento.' },
  { product: 'Leite em Pó', requirement: 'Armazenar em local seco, arejado, longe de luz solar direta e fontes de calor. Umidade relativa máxima 65%. Após abertura, transferir para recipiente hermético, identificar com data de abertura e consumir em até 30 dias.', temperature: 'Ambiente (15–20°C, umidade < 65%)', risk: 'Médio', action: 'Verificar umidade do estoque semanalmente com higrômetro. Lacrar embalagens com clipe ou transferir para pote hermético. Descartar se apresentar grumos, odor ranço ou coloração alterada.' },
  { product: 'Leite Condensado', requirement: 'Antes de abrir: ambiente fresco e seco. Após abertura: transferir IMEDIATAMENTE para recipiente plástico/vidro com tampa, refrigerar 2–8°C e consumir em até 48h. Nunca armazenar na lata aberta.', temperature: 'Ambiente (fechado) / Refrigerado 2–8°C (aberto)', risk: 'Médio', action: 'Identificar recipiente com data e hora de abertura. Descartar se ultrapassar 48h ou odor azedo. Verificar amassados ou ferrugem na lata.' },
  { product: 'Creme de Leite', requirement: 'UHT: ambiente até abertura, depois refrigerar 2–8°C e consumir em 24h. Fresco: refrigerar desde recepção. Rejeitar embalagem estufada.', temperature: 'Ambiente/Refrigerado 2–8°C', risk: 'Médio', action: 'Anotar data e hora de abertura. Não misturar produto de datas diferentes. Descartar se coágulos, odor azedo ou coloração amarelada.' },
  { product: 'Chantilly', requirement: 'Refrigeração contínua obrigatória 2–7°C. Crítico: nunca ultrapassar 10°C. Altamente perecível. Não recongelar. Bater apenas quantidade a ser usada imediatamente.', temperature: 'Câmara Fria (2–7°C)', risk: 'Alto', action: 'Monitorar temperatura da câmara a cada 4h. Manter longe da porta. Registrar em ficha de controle. Descartar se >10°C por mais de 1h.' },
  { product: 'Queijo Mussarela', requirement: 'Câmara fria 2–8°C. Após fatiamento: embalar em PVC ou papel encerado, identificar com data e consumir em 5 dias. Inspecionar diariamente aparência, textura, odor e cor.', temperature: 'Câmara Fria (2–8°C)', risk: 'Alto', action: 'Nunca deixar fora da câmara por mais de 2h. Descartar se mofo, odor ácido ou textura viscosa. Higienizar mãos antes de manipular.' },
  { product: 'Queijo Prato', requirement: 'Câmara fria 2–8°C. Manter na embalagem original até uso. Após corte: filme PVC + data, consumir em 7 dias.', temperature: 'Câmara Fria (2–8°C)', risk: 'Alto', action: 'Registrar data de abertura em cada peça. Não armazenar junto a produtos com odor forte. Descartar se mofo ou ressecamento excessivo.' },
  { product: 'Presunto Cozido', requirement: 'Câmara fria 0–4°C. Alto risco microbiológico. Após fatiamento: vácuo ou PVC + data/hora, consumir em 5 dias. Coloração rosada uniforme.', temperature: 'Câmara Fria (0–4°C)', risk: 'Alto', action: 'Higienizar utensílios com hipoclorito. Nunca fatiar sobre madeira. Descartar se coloração escura, muco superficial ou odor ácido.' },
  { product: 'Manteiga', requirement: 'Refrigeração 2–8°C. Após aberta: até 30 dias. Não expor à temperatura ambiente por mais de 2h. Proteger da luz.', temperature: 'Câmara Fria (2–8°C)', risk: 'Médio', action: 'Não usar utensílios úmidos na embalagem. Descartar se odor rançoso ou pontos escuros. Anotar data de abertura.' },
  { product: 'Fermento Biológico Fresco', requirement: 'Refrigeração 2–8°C. Vida útil curta (15–20 dias). Verificar validade DIARIAMENTE. Não congelar. Odor normal: levemente alcoólico.', temperature: 'Câmara Fria (2–8°C)', risk: 'Alto', action: 'Rodízio FEFO rigoroso. Descartar se cor escura, odor putrefato ou superfície pegajosa. Manter longe da porta da câmara.' },
  { product: 'Ovos', requirement: 'Ambiente limpo, seco e protegido. Lavar apenas antes do uso.', temperature: 'Ambiente (até 20°C)', risk: 'Alto', action: 'Inspecionar trincas diariamente. Higienizar com solução clorada antes do uso.' },
  { product: 'Farinha de Trigo', requirement: 'Local seco, arejado, protegido de pragas. Umidade máx. 14%.', temperature: 'Ambiente (15–25°C)', risk: 'Médio', action: 'Verificar umidade semanalmente. Usar PEPS/FEFO. Inspecionar embalagens.' },
  { product: 'Açúcar Refinado/Cristal', requirement: 'Local seco, longe de odor forte. Embalagem fechada.', temperature: 'Ambiente (15–25°C)', risk: 'Baixo', action: 'Rotação de estoque. Evitar contato com o piso.' },
  { product: 'Óleo de Soja', requirement: 'Local fresco, longe de luz e calor. Verificar cor e odor.', temperature: 'Ambiente (até 25°C)', risk: 'Baixo', action: 'Não reutilizar óleo de fritura. Descartar se escurecido.' },
  { product: 'Chocolate em Pó', requirement: 'Local seco, arejado. Embalagem fechada após uso.', temperature: 'Ambiente (15–20°C)', risk: 'Baixo', action: 'Verificar grumos. Usar dentro de 6 meses após abertura.' },
  { product: 'Embalagens', requirement: 'Local seco, limpo, separado de alimentos. Verificar integridade.', temperature: 'Ambiente', risk: 'Baixo', action: 'Inspeção de pragas mensalmente. Não usar embalagens danificadas.' },
]

const IMPORTED_PRODUCTS = [
  { code: 'MP001', name: 'Farinha de Trigo Especial', category: 'Matéria-Prima', qty: 2025, unit: 'kg', cost: 3.2, supplier: 'Moinho Nobre', aisle: 'A', shelf: '1' },
  { code: 'MP002', name: 'Farinha de Trigo Comum', category: 'Matéria-Prima', qty: 360, unit: 'kg', cost: 2.8, supplier: 'Moinho Nobre', aisle: 'A', shelf: '2' },
  { code: 'MP003', name: 'Açúcar Refinado', category: 'Matéria-Prima', qty: 108, unit: 'kg', cost: 4.5, supplier: 'Cristalcana', aisle: 'A', shelf: '3' },
  { code: 'MP004', name: 'Açúcar Cristal', category: 'Matéria-Prima', qty: 264, unit: 'kg', cost: 3.9, supplier: 'Cristalcana', aisle: 'A', shelf: '4' },
  { code: 'MP005', name: 'Açúcar Confeiteiro', category: 'Matéria-Prima', qty: 100, unit: 'kg', cost: 5.2, supplier: 'Cristalcana', aisle: 'A', shelf: '5' },
  { code: 'MP006', name: 'Fermento Biológico Fresco', category: 'Matéria-Prima', qty: 66.5, unit: 'kg', cost: 18, supplier: 'Lesaffre', aisle: 'B', shelf: '1', refrig: true },
  { code: 'MP007', name: 'Fermento Biológico Seco', category: 'Matéria-Prima', qty: 15.6, unit: 'kg', cost: 42, supplier: 'Lesaffre', aisle: 'B', shelf: '2' },
  { code: 'MP008', name: 'Fermento Químico', category: 'Matéria-Prima', qty: 8.8, unit: 'kg', cost: 22, supplier: 'Fleischmann', aisle: 'B', shelf: '3' },
  { code: 'MP009', name: 'Sal Refinado', category: 'Matéria-Prima', qty: 156, unit: 'kg', cost: 1.8, supplier: 'Salinas', aisle: 'B', shelf: '4' },
  { code: 'MP010', name: 'Margarina Industrial', category: 'Matéria-Prima', qty: 80, unit: 'kg', cost: 12.5, supplier: 'Bunge', aisle: 'B', shelf: '5', refrig: true },
  { code: 'MP011', name: 'Gordura Vegetal', category: 'Matéria-Prima', qty: 210, unit: 'kg', cost: 9.8, supplier: 'Bunge', aisle: 'C', shelf: '1' },
  { code: 'MP012', name: 'Óleo de Soja', category: 'Matéria-Prima', qty: 192, unit: 'L', cost: 7.2, supplier: 'Soya', aisle: 'C', shelf: '2' },
  { code: 'MP013', name: 'Leite Integral', category: 'Frios/Laticínios', qty: 105, unit: 'L', cost: 4.8, supplier: 'Italac', aisle: 'C', shelf: '3', refrig: true },
  { code: 'MP014', name: 'Leite em Pó Integral', category: 'Frios/Laticínios', qty: 24, unit: 'kg', cost: 28, supplier: 'Ninho', aisle: 'C', shelf: '4' },
  { code: 'MP015', name: 'Leite Condensado', category: 'Matéria-Prima', qty: 30, unit: 'lata', cost: 8.5, supplier: 'Moça', aisle: 'C', shelf: '5' },
  { code: 'MP016', name: 'Creme de Leite', category: 'Frios/Laticínios', qty: 45, unit: 'caixa', cost: 4.2, supplier: 'Nestlé', aisle: 'D', shelf: '1', refrig: true },
  { code: 'MP017', name: 'Chantilly', category: 'Frios/Laticínios', qty: 38, unit: 'L', cost: 14, supplier: 'Amélia', aisle: 'D', shelf: '2', refrig: true },
  { code: 'MP018', name: 'Ovos', category: 'Matéria-Prima', qty: 444, unit: 'dúzia', cost: 9.5, supplier: 'Granja São João', aisle: 'D', shelf: '3' },
  { code: 'MP019', name: 'Manteiga', category: 'Frios/Laticínios', qty: 86, unit: 'kg', cost: 38, supplier: 'Aviação', aisle: 'D', shelf: '4', refrig: true },
  { code: 'MP020', name: 'Chocolate em Pó 50%', category: 'Matéria-Prima', qty: 18, unit: 'kg', cost: 22, supplier: 'Harald', aisle: 'D', shelf: '5' },
  { code: 'MP023', name: 'Queijo Mussarela', category: 'Frios/Laticínios', qty: 56, unit: 'kg', cost: 28, supplier: 'Sadia', aisle: 'F', shelf: '1', refrig: true },
  { code: 'MP024', name: 'Queijo Prato', category: 'Frios/Laticínios', qty: 42, unit: 'kg', cost: 32, supplier: 'Sadia', aisle: 'F', shelf: '2', refrig: true },
  { code: 'MP025', name: 'Presunto Cozido', category: 'Frios/Laticínios', qty: 35, unit: 'kg', cost: 26, supplier: 'Sadia', aisle: 'F', shelf: '3', refrig: true },
  { code: 'EM001', name: 'Embalagem Pão Francês', category: 'Embalagens', qty: 5200, unit: 'pct', cost: 0.45, supplier: 'Embapel', aisle: 'H', shelf: '1' },
  { code: 'EM002', name: 'Sacola Personalizada', category: 'Embalagens', qty: 3800, unit: 'pct', cost: 0.65, supplier: 'Embapel', aisle: 'H', shelf: '2' },
  { code: 'EM003', name: 'Caixa Torta Grande', category: 'Embalagens', qty: 420, unit: 'un', cost: 2.8, supplier: 'Papelão Sul', aisle: 'H', shelf: '4' },
  { code: 'IN001', name: 'Recheio Doce de Leite', category: 'Insumos', qty: 97.2, unit: 'kg', cost: 18, supplier: 'Nestlé', aisle: 'I', shelf: '5' },
  { code: 'IN002', name: 'Recheio Goiaba', category: 'Insumos', qty: 146.9, unit: 'kg', cost: 12, supplier: 'Predilecta', aisle: 'I', shelf: '4' },
  { code: 'IN003', name: 'Uva Passa', category: 'Insumos', qty: 139, unit: 'kg', cost: 22, supplier: 'Importadora Sul', aisle: 'J', shelf: '4' },
  { code: 'IN004', name: 'Frutas Cristalizadas', category: 'Insumos', qty: 176.4, unit: 'kg', cost: 28, supplier: 'Importadora Sul', aisle: 'J', shelf: '5' },
  { code: 'IN005', name: 'Amido de Milho', category: 'Insumos', qty: 116.7, unit: 'kg', cost: 6.5, supplier: 'Maisena', aisle: 'K', shelf: '1' },
  { code: 'IN006', name: 'Bicarbonato de Sódio', category: 'Insumos', qty: 40.7, unit: 'kg', cost: 8, supplier: 'Kitano', aisle: 'K', shelf: '2' },
  { code: 'IN007', name: 'Corante Alimentício', category: 'Insumos', qty: 82.5, unit: 'frs', cost: 15, supplier: 'Arcolor', aisle: 'E', shelf: '5' },
  { code: 'IN008', name: 'Glacê Real', category: 'Insumos', qty: 178.1, unit: 'kg', cost: 12, supplier: 'Arcolor', aisle: 'J', shelf: '2' },
  { code: 'IN009', name: 'Cream Cheese', category: 'Frios/Laticínios', qty: 32, unit: 'kg', cost: 35, supplier: 'Sadia', aisle: 'F', shelf: '4', refrig: true },
  { code: 'IN010', name: 'Calabresa Fatiada', category: 'Frios/Laticínios', qty: 28, unit: 'kg', cost: 22, supplier: 'Sadia', aisle: 'F', shelf: '5', refrig: true },
]

// Seed demo (products + movements + settings + sanitary)
async function ensureSeed(db) {
  const count = await db.collection('products').countDocuments()
  if (count === 0) {
    const now = new Date()
    const inDays = (d) => new Date(now.getTime() + d * 86400000).toISOString()
    // Distribute expiries across buckets so cards have varied colors
    const docs = IMPORTED_PRODUCTS.map((p, i) => {
      const daysMap = [4, 12, 22, 45, 90, 180, 300]
      const days = p.refrig ? daysMap[i % 4] : daysMap[(i % 3) + 3]
      const codeKey = p.code.startsWith('EM') ? 'B' : p.code.startsWith('IN') ? 'C' : 'A'
      return {
        id: uuidv4(),
        name: p.name,
        code: p.code,
        price: p.cost,
        description: `${p.category} — Fornecedor: ${p.supplier}`,
        quantity: p.qty,
        unit: p.unit,
        category: p.category,
        codeKey,
        lot: `L2026-${String(i + 1).padStart(3, '0')}`,
        expiresAt: inDays(days),
        location: `Corredor ${p.aisle} - Prateleira ${p.shelf}`,
        aisle: p.aisle,
        shelf: p.shelf,
        supplier: p.supplier,
        imageUrl: '',
        requiresRefrigeration: !!p.refrig,
        createdAt: new Date().toISOString(),
      }
    })
    await db.collection('products').insertMany(docs)

    const movements = []
    for (let i = 30; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000)
      docs.slice(0, 15).forEach(p => {
        const inQ = Math.floor(Math.random() * 8) + 2
        const outQ = Math.floor(Math.random() * 10) + 1
        movements.push({ id: uuidv4(), productId: p.id, productName: p.name, type: 'in', quantity: inQ, at: day.toISOString() })
        movements.push({ id: uuidv4(), productId: p.id, productName: p.name, type: 'out', quantity: outQ, at: day.toISOString() })
      })
    }
    await db.collection('movements').insertMany(movements)
  }

  const sc = await db.collection('settings').countDocuments({ id: 'fefo-colors' })
  if (sc === 0) {
    await db.collection('settings').insertOne({
      id: 'fefo-colors', safe: '#10b981', warning: '#f59e0b', critical: '#ef4444', expired: '#6b7280',
      thresholdWarningDays: 30, thresholdCriticalDays: 7,
    })
  }

  const sanCount = await db.collection('sanitary').countDocuments()
  if (sanCount === 0) {
    await db.collection('sanitary').insertMany(SANITARY_SEED.map(s => ({ id: uuidv4(), ...s })))
  }
}

function signToken(user) {
  return jwt.sign({ uid: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}
function getAuth(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  return verifyToken(token)
}

async function handler(request, ctx) {
  try {
    const db = await getDb()
    await ensureSeed(db)
    const p = await ctx.params
    const path = (p?.path || []).join('/')
    const method = request.method

    // ---------- AUTH ----------
    if (path === 'auth/register' && method === 'POST') {
      const b = await request.json()
      if (!b.email || !b.password) return err('E-mail e senha obrigatórios', 400)
      const exists = await db.collection('users').findOne({ email: b.email.toLowerCase() })
      if (exists) return err('E-mail já cadastrado', 409)
      const hash = await bcrypt.hash(b.password, 8)
      const isFirst = (await db.collection('users').countDocuments()) === 0
      const u = {
        id: uuidv4(), email: b.email.toLowerCase(), name: b.name || b.email.split('@')[0],
        passwordHash: hash, provider: 'email', blocked: false, role: isFirst ? 'admin' : 'user',
        subscriptionActive: true, createdAt: new Date().toISOString(),
      }
      await db.collection('users').insertOne(u)
      return json({ token: signToken(u), user: { id: u.id, email: u.email, name: u.name, role: u.role } })
    }
    if (path === 'auth/login' && method === 'POST') {
      const b = await request.json()
      const u = await db.collection('users').findOne({ email: (b.email || '').toLowerCase() })
      if (!u) return err('Credenciais inválidas', 401)
      if (u.blocked) return err('Conta bloqueada. Pacote mensal em atraso — entre em contato com a Sinergia.', 403)
      const ok = u.passwordHash ? await bcrypt.compare(b.password || '', u.passwordHash) : false
      if (!ok) return err('Credenciais inválidas', 401)
      return json({ token: signToken(u), user: { id: u.id, email: u.email, name: u.name, role: u.role } })
    }
    if (path === 'auth/google' && method === 'POST') {
      // Simplified Google sign-in: front sends { email, name, picture }
      const b = await request.json()
      if (!b.email) return err('E-mail obrigatório', 400)
      const email = b.email.toLowerCase()
      let u = await db.collection('users').findOne({ email })
      if (!u) {
        const isFirst = (await db.collection('users').countDocuments()) === 0
        u = { id: uuidv4(), email, name: b.name || email.split('@')[0], picture: b.picture || '', provider: 'google', blocked: false, role: isFirst ? 'admin' : 'user', subscriptionActive: true, createdAt: new Date().toISOString() }
        await db.collection('users').insertOne(u)
      }
      if (u.blocked) return err('Conta bloqueada. Pacote mensal em atraso.', 403)
      return json({ token: signToken(u), user: { id: u.id, email: u.email, name: u.name, role: u.role, picture: u.picture } })
    }
    if (path === 'auth/me' && method === 'GET') {
      const a = getAuth(request); if (!a) return err('Não autenticado', 401)
      const u = await db.collection('users').findOne({ id: a.uid }, { projection: { _id: 0, passwordHash: 0 } })
      if (!u || u.blocked) return err('Sessão inválida', 401)
      return json(u)
    }

    // ---------- ADMIN ----------
    if (path === 'admin/unlock' && method === 'POST') {
      const b = await request.json()
      const ok = b.password === 'Sinergia@2026'
      if (!ok) {
        // rate-limit info (simple)
        await db.collection('adminAttempts').insertOne({ at: new Date().toISOString(), ok: false })
        return err('Senha incorreta', 401)
      }
      return json({ ok: true, token: jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '2h' }) })
    }
    if (path === 'admin/users' && method === 'GET') {
      const a = getAuth(request); if (!a?.admin) return err('Admin requerido', 403)
      const users = await db.collection('users').find({}, { projection: { _id: 0, passwordHash: 0 } }).sort({ createdAt: -1 }).toArray()
      return json(users)
    }
    if (path === 'admin/toggle-block' && method === 'POST') {
      const a = getAuth(request); if (!a?.admin) return err('Admin requerido', 403)
      const b = await request.json()
      const u = await db.collection('users').findOne({ id: b.userId })
      if (!u) return err('Usuário não encontrado', 404)
      await db.collection('users').updateOne({ id: b.userId }, { $set: { blocked: !u.blocked } })
      return json({ ok: true, blocked: !u.blocked })
    }

    // ---------- TEAMS ----------
    if (path === 'teams' && method === 'GET') {
      const a = getAuth(request); if (!a?.uid) return err('Não autenticado', 401)
      const t = await db.collection('teams').find({ ownerId: a.uid }, { projection: { _id: 0 } }).toArray()
      return json(t)
    }
    if (path === 'teams' && method === 'POST') {
      const a = getAuth(request); if (!a?.uid) return err('Não autenticado', 401)
      const b = await request.json()
      const team = { id: uuidv4(), ownerId: a.uid, name: b.name || 'Minha Equipe', members: [], createdAt: new Date().toISOString() }
      await db.collection('teams').insertOne(team)
      const { _id, ...c } = team; return json(c, { status: 201 })
    }
    if (path.match(/^teams\/[^/]+\/members$/) && method === 'POST') {
      const a = getAuth(request); if (!a?.uid) return err('Não autenticado', 401)
      const teamId = path.split('/')[1]
      const b = await request.json()
      const member = { id: uuidv4(), name: b.name, email: b.email, role: b.role || 'operador', addedAt: new Date().toISOString() }
      await db.collection('teams').updateOne({ id: teamId, ownerId: a.uid }, { $push: { members: member } })
      const team = await db.collection('teams').findOne({ id: teamId }, { projection: { _id: 0 } })
      return json(team)
    }
    if (path.match(/^teams\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') {
      const a = getAuth(request); if (!a?.uid) return err('Não autenticado', 401)
      const [_, teamId, __, memberId] = path.split('/')
      await db.collection('teams').updateOne({ id: teamId, ownerId: a.uid }, { $pull: { members: { id: memberId } } })
      return json({ ok: true })
    }

    // ---------- SANITARY ----------
    if (path === 'sanitary' && method === 'GET') {
      const items = await db.collection('sanitary').find({}, { projection: { _id: 0 } }).toArray()
      return json(items)
    }
    if (path === 'sanitary' && method === 'POST') {
      const b = await request.json()
      const doc = { id: uuidv4(), product: b.product, requirement: b.requirement || '', temperature: b.temperature || '', risk: b.risk || 'Médio', action: b.action || '' }
      await db.collection('sanitary').insertOne(doc); const { _id, ...c } = doc; return json(c, { status: 201 })
    }
    if (path.startsWith('sanitary/') && method === 'PUT') {
      const id = path.split('/')[1]
      const b = await request.json()
      delete b._id; delete b.id
      await db.collection('sanitary').updateOne({ id }, { $set: b })
      const item = await db.collection('sanitary').findOne({ id }, { projection: { _id: 0 } })
      return json(item)
    }
    if (path.startsWith('sanitary/') && method === 'DELETE') {
      const id = path.split('/')[1]
      await db.collection('sanitary').deleteOne({ id }); return json({ ok: true })
    }

    // ---------- PRODUCTS ----------
    if (path === 'products' && method === 'GET') {
      const items = await db.collection('products').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray()
      return json(items)
    }
    if (path === 'products' && method === 'POST') {
      const b = await request.json()
      const doc = {
        id: uuidv4(), name: b.name || 'Sem nome', code: b.code || '',
        price: Number(b.price) || 0, description: b.description || '',
        quantity: Number(b.quantity) || 0, unit: b.unit || 'un',
        category: b.category || 'Matéria-Prima', codeKey: b.codeKey || 'A',
        lot: b.lot || `L${Date.now()}`, expiresAt: b.expiresAt || new Date(Date.now() + 90 * 86400000).toISOString(),
        location: b.location || 'A definir', supplier: b.supplier || '',
        imageUrl: b.imageUrl || '', requiresRefrigeration: !!b.requiresRefrigeration,
        createdAt: new Date().toISOString(),
      }
      await db.collection('products').insertOne(doc); const { _id, ...c } = doc; return json(c, { status: 201 })
    }
    if (path.startsWith('products/') && method === 'PUT') {
      const id = path.split('/')[1]; const b = await request.json()
      const upd = { ...b }; delete upd._id; delete upd.id; delete upd.createdAt
      if (upd.price !== undefined) upd.price = Number(upd.price)
      if (upd.quantity !== undefined) upd.quantity = Number(upd.quantity)
      await db.collection('products').updateOne({ id }, { $set: upd })
      const item = await db.collection('products').findOne({ id }, { projection: { _id: 0 } })
      return json(item)
    }
    if (path.startsWith('products/') && method === 'DELETE') {
      const id = path.split('/')[1]
      await db.collection('products').deleteOne({ id })
      await db.collection('movements').deleteMany({ productId: id })
      return json({ ok: true })
    }

    // ---------- MOVEMENTS ----------
    if (path === 'movements' && method === 'GET') {
      const items = await db.collection('movements').find({}, { projection: { _id: 0 } }).sort({ at: -1 }).toArray()
      return json(items)
    }
    if (path === 'movements' && method === 'POST') {
      const b = await request.json()
      const product = await db.collection('products').findOne({ id: b.productId })
      if (!product) return err('Produto não encontrado', 404)
      const type = b.type === 'in' ? 'in' : 'out'
      const quantity = Math.max(1, Number(b.quantity) || 1)
      const delta = type === 'in' ? quantity : -quantity
      const newQty = Math.max(0, (product.quantity || 0) + delta)
      await db.collection('products').updateOne({ id: product.id }, { $set: { quantity: newQty } })
      const mv = { id: uuidv4(), productId: product.id, productName: product.name, type, quantity, at: new Date().toISOString() }
      await db.collection('movements').insertOne(mv); const { _id, ...c } = mv; return json(c, { status: 201 })
    }

    // ---------- SETTINGS ----------
    if (path === 'settings/fefo' && method === 'GET') {
      const s = await db.collection('settings').findOne({ id: 'fefo-colors' }, { projection: { _id: 0 } }); return json(s)
    }
    if (path === 'settings/fefo' && method === 'PUT') {
      const b = await request.json(); const upd = {}
      ;['safe','warning','critical','expired','thresholdWarningDays','thresholdCriticalDays'].forEach(k => { if (b[k] !== undefined) upd[k] = b[k] })
      await db.collection('settings').updateOne({ id: 'fefo-colors' }, { $set: upd })
      const s = await db.collection('settings').findOne({ id: 'fefo-colors' }, { projection: { _id: 0 } }); return json(s)
    }

    // ---------- ANALYTICS ----------
    if (path === 'analytics/summary' && method === 'GET') {
      const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray()
      const movements = await db.collection('movements').find({}, { projection: { _id: 0 } }).toArray()
      const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
      const totalValue = products.reduce((s, p) => s + (p.quantity || 0) * (p.price || 0), 0)
      const dayMap = {}; const now = Date.now()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 86400000); const key = d.toISOString().slice(0, 10)
        dayMap[key] = { date: key, entrada: 0, saida: 0 }
      }
      movements.forEach(m => {
        const key = (m.at || '').slice(0, 10)
        if (dayMap[key]) { if (m.type === 'in') dayMap[key].entrada += m.quantity; else dayMap[key].saida += m.quantity }
      })
      const series = Object.values(dayMap)
      const outflows = series.map(s => s.saida).sort((a, b) => a - b)
      const median = outflows.length ? outflows[Math.floor(outflows.length / 2)] : 0
      // Aggregate totals last 30d
      const totalIn30 = series.reduce((s, x) => s + x.entrada, 0)
      const totalOut30 = series.reduce((s, x) => s + x.saida, 0)
      const avgDailyIn = Math.round(totalIn30 / 30)
      const avgDailyOut = Math.round(totalOut30 / 30)
      // Category breakdown by value
      const byCategory = {}
      products.forEach(p => {
        const c = p.category || 'Outros'
        if (!byCategory[c]) byCategory[c] = { category: c, quantidade: 0, valor: 0, itens: 0 }
        byCategory[c].quantidade += p.quantity || 0
        byCategory[c].valor += (p.quantity || 0) * (p.price || 0)
        byCategory[c].itens += 1
      })
      const categoryData = Object.values(byCategory).map(c => ({
        ...c, quantidade: Math.round(c.quantidade), valor: Number(c.valor.toFixed(2))
      })).sort((a, b) => b.valor - a.valor)
      // Coverage per product (days until stockout)
      const outByProduct = {}
      movements.forEach(m => {
        if (m.type === 'out') outByProduct[m.productId] = (outByProduct[m.productId] || 0) + m.quantity
      })
      const coverage = products.map(p => {
        const totalOut = outByProduct[p.id] || 0
        const dailyAvg = totalOut / 30
        const days = dailyAvg > 0 ? Math.floor((p.quantity || 0) / dailyAvg) : 999
        return { name: p.name, code: p.code, category: p.category, quantity: p.quantity, dailyAvg: Number(dailyAvg.toFixed(2)), coverageDays: days > 999 ? 999 : days }
      }).sort((a, b) => a.coverageDays - b.coverageDays).slice(0, 10)
      return json({
        totalProducts: products.length, totalStock: Math.round(totalStock),
        totalValue: Number(totalValue.toFixed(2)), series,
        projectedMonthly: Math.round(median * 30), medianDailyOut: median,
        totalIn30, totalOut30, avgDailyIn, avgDailyOut,
        balance30: totalIn30 - totalOut30,
        categoryData, coverage,
      })
    }

    // ---------- EXCEL ----------
    if (path === 'excel/export' && method === 'GET') {
      const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray()
      const movements = await db.collection('movements').find({}, { projection: { _id: 0 } }).toArray()
      const sanitary = await db.collection('sanitary').find({}, { projection: { _id: 0 } }).toArray()

      const pRows = products.map(p => ({
        'Código Produto': p.code || '', 'Nome': p.name, 'Categoria': p.category, 'Código-Chave': p.codeKey,
        'Estoque Atual': p.quantity, 'Unidade': p.unit || 'un', 'Custo Unitário (R$)': p.price,
        'Valor em Estoque (R$)': (p.quantity || 0) * (p.price || 0),
        'Lote': p.lot, 'Validade': (p.expiresAt || '').slice(0, 10), 'Localização': p.location,
        'Fornecedor': p.supplier || '', 'Refrigeração': p.requiresRefrigeration ? 'Sim' : 'Não',
      }))
      const mRows = movements.map(m => ({ 'Produto': m.productName, 'Tipo': m.type === 'in' ? 'Entrada' : 'Saída', 'Quantidade': m.quantity, 'Data': (m.at || '').slice(0, 10) }))
      const sRows = sanitary.map(s => ({ 'Produto': s.product, 'Exigência Sanitária': s.requirement, 'Temperatura Ideal': s.temperature, 'Nível de Risco': s.risk, 'Ação Recomendada': s.action }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pRows), 'Produtos')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mRows), 'Movimentações')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sRows), 'Vigilância Sanitária')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const filename = `sinergia_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      return new NextResponse(buf, {
        status: 200, headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      })
    }
    if (path === 'excel/import' && method === 'POST') {
      const b = await request.json()
      if (!b.file) return err('Arquivo não enviado', 400)
      const base64 = b.file.split(',').pop()
      const buf = Buffer.from(base64, 'base64')
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheetNames = wb.SheetNames
      let imported = 0
      // Try to find products sheet: first sheet OR "Produtos" OR "Sheet1"
      const productSheetName = sheetNames.find(n => /produto|sheet1/i.test(n)) || sheetNames[0]
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[productSheetName])
      const docs = []
      for (const r of rows) {
        const name = r['Nome'] || r['Produto'] || r['Código Produto'] || ''
        if (!name || String(name).trim() === '') continue
        const qty = Number(r['Estoque Atual'] || r['Quantidade'] || r['Estoque'] || 0)
        const cost = Number(r['Custo Unitário (R$)'] || r['Custo Unitário'] || r['Preço'] || r['Custo'] || 0)
        const cat = r['Categoria'] || 'Matéria-Prima'
        const code = r['Código Produto'] || r['Código'] || ''
        const codeKey = String(code).startsWith('EM') ? 'B' : String(code).startsWith('IN') ? 'C' : 'A'
        const supplier = r['Fornecedor'] || ''
        const aisle = r['Corredor'] || ''
        const shelf = r['Prateleira'] || ''
        const validadeRaw = r['Validade'] || r['Data Validade'] || ''
        let expiresAt = new Date(Date.now() + 90 * 86400000).toISOString()
        if (validadeRaw) {
          const d = new Date(validadeRaw)
          if (!isNaN(d.getTime())) expiresAt = d.toISOString()
        }
        docs.push({
          id: uuidv4(), name: String(name), code: String(code), category: cat, codeKey,
          price: cost, quantity: qty, unit: r['Unidade'] || 'un',
          description: `Importado. Fornecedor: ${supplier}`,
          lot: r['Lote'] || `L${Date.now()}-${imported}`,
          expiresAt, location: aisle && shelf ? `Corredor ${aisle} - Prateleira ${shelf}` : (r['Localização'] || 'A definir'),
          aisle: String(aisle), shelf: String(shelf), supplier: String(supplier),
          imageUrl: '', requiresRefrigeration: /refrige/i.test(String(r['Refrigeração'] || '')),
          createdAt: new Date().toISOString(),
        })
        imported++
      }
      if (docs.length) await db.collection('products').insertMany(docs)
      return json({ imported, sheet: productSheetName, totalSheets: sheetNames.length })
    }
    if (path === 'excel/reset' && method === 'POST') {
      await db.collection('products').deleteMany({})
      await db.collection('movements').deleteMany({})
      return json({ ok: true })
    }

    return err('Rota não encontrada: ' + path, 404)
  } catch (e) {
    console.error('API error:', e)
    return err(e.message || 'Erro interno', 500)
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
