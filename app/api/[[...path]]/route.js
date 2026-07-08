import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const uri = process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'sinergia'

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

// Seed initial demo data
async function ensureSeed(db) {
  const count = await db.collection('products').countDocuments()
  if (count > 0) return
  const now = new Date()
  const inDays = (d) => new Date(now.getTime() + d * 86400000).toISOString()
  const demo = [
    { name: 'Leite Integral 1L', price: 6.49, description: 'Leite UHT integral, embalagem tetra pak.', quantity: 120, category: 'Matéria-Prima', codeKey: 'A', lot: 'L2026-001', expiresAt: inDays(12), location: 'Câmara Fria - Prateleira A1', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', requiresRefrigeration: true },
    { name: 'Farinha de Trigo 5kg', price: 22.90, description: 'Farinha tipo 1 para panificação.', quantity: 65, category: 'Matéria-Prima', codeKey: 'B', lot: 'L2026-014', expiresAt: inDays(120), location: 'Estoque Seco - B3', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', requiresRefrigeration: false },
    { name: 'Óleo de Soja 900ml', price: 9.20, description: 'Óleo refinado de soja.', quantity: 200, category: 'Matéria-Prima', codeKey: 'A', lot: 'L2026-022', expiresAt: inDays(300), location: 'Estoque Seco - C2', imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', requiresRefrigeration: false },
    { name: 'Iogurte Natural 170g', price: 3.75, description: 'Iogurte integral sem adição de açúcar.', quantity: 45, category: 'Produto Final', codeKey: 'C', lot: 'L2026-030', expiresAt: inDays(4), location: 'Câmara Fria - A2', imageUrl: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400', requiresRefrigeration: true },
    { name: 'Açúcar Cristal 1kg', price: 4.10, description: 'Açúcar cristal branco refinado.', quantity: 300, category: 'Matéria-Prima', codeKey: 'B', lot: 'L2026-005', expiresAt: inDays(400), location: 'Estoque Seco - D1', imageUrl: 'https://images.unsplash.com/photo-1610906320019-1a5e4c9d54a1?w=400', requiresRefrigeration: false },
    { name: 'Manteiga sem Sal 200g', price: 12.50, description: 'Manteiga extra sem sal.', quantity: 28, category: 'Matéria-Prima', codeKey: 'C', lot: 'L2026-041', expiresAt: inDays(30), location: 'Câmara Fria - A3', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', requiresRefrigeration: true },
  ]
  const docs = demo.map(p => ({ id: uuidv4(), createdAt: new Date().toISOString(), ...p }))
  await db.collection('products').insertMany(docs)

  // Seed movements for last 30 days
  const movements = []
  for (let i = 30; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000)
    docs.forEach(p => {
      const inQ = Math.floor(Math.random() * 8) + 2
      const outQ = Math.floor(Math.random() * 10) + 1
      movements.push({ id: uuidv4(), productId: p.id, productName: p.name, type: 'in', quantity: inQ, at: day.toISOString() })
      movements.push({ id: uuidv4(), productId: p.id, productName: p.name, type: 'out', quantity: outQ, at: day.toISOString() })
    })
  }
  await db.collection('movements').insertMany(movements)

  await db.collection('settings').insertOne({
    id: 'fefo-colors',
    safe: '#10b981',      // > 30 dias
    warning: '#f59e0b',   // 8-30 dias
    critical: '#ef4444',  // <=7 dias
    expired: '#6b7280',   // vencido
    thresholdWarningDays: 30,
    thresholdCriticalDays: 7,
  })
}

async function handler(request, { params }) {
  try {
    const db = await getDb()
    await ensureSeed(db)
    const path = (params?.path || []).join('/')
    const method = request.method

    // ---------- PRODUCTS ----------
    if (path === 'products' && method === 'GET') {
      const items = await db.collection('products').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray()
      return json(items)
    }
    if (path === 'products' && method === 'POST') {
      const body = await request.json()
      const doc = {
        id: uuidv4(),
        name: body.name || 'Sem nome',
        price: Number(body.price) || 0,
        description: body.description || '',
        quantity: Number(body.quantity) || 0,
        category: body.category || 'Matéria-Prima',
        codeKey: body.codeKey || 'A',
        lot: body.lot || `L${Date.now()}`,
        expiresAt: body.expiresAt || new Date(Date.now() + 90 * 86400000).toISOString(),
        location: body.location || 'A definir',
        imageUrl: body.imageUrl || '',
        requiresRefrigeration: !!body.requiresRefrigeration,
        createdAt: new Date().toISOString(),
      }
      await db.collection('products').insertOne(doc)
      const { _id, ...clean } = doc
      return json(clean, { status: 201 })
    }
    if (path.startsWith('products/') && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const upd = { ...body }
      delete upd._id; delete upd.id; delete upd.createdAt
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
      const body = await request.json()
      const product = await db.collection('products').findOne({ id: body.productId })
      if (!product) return err('Produto não encontrado', 404)
      const type = body.type === 'in' ? 'in' : 'out'
      const quantity = Math.max(1, Number(body.quantity) || 1)
      const delta = type === 'in' ? quantity : -quantity
      const newQty = Math.max(0, (product.quantity || 0) + delta)
      await db.collection('products').updateOne({ id: product.id }, { $set: { quantity: newQty } })
      const mv = { id: uuidv4(), productId: product.id, productName: product.name, type, quantity, at: new Date().toISOString() }
      await db.collection('movements').insertOne(mv)
      const { _id, ...clean } = mv
      return json(clean, { status: 201 })
    }

    // ---------- SETTINGS (FEFO colors) ----------
    if (path === 'settings/fefo' && method === 'GET') {
      const s = await db.collection('settings').findOne({ id: 'fefo-colors' }, { projection: { _id: 0 } })
      return json(s)
    }
    if (path === 'settings/fefo' && method === 'PUT') {
      const body = await request.json()
      const upd = {}
      ;['safe','warning','critical','expired','thresholdWarningDays','thresholdCriticalDays'].forEach(k => {
        if (body[k] !== undefined) upd[k] = body[k]
      })
      await db.collection('settings').updateOne({ id: 'fefo-colors' }, { $set: upd })
      const s = await db.collection('settings').findOne({ id: 'fefo-colors' }, { projection: { _id: 0 } })
      return json(s)
    }

    // ---------- ANALYTICS ----------
    if (path === 'analytics/summary' && method === 'GET') {
      const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray()
      const movements = await db.collection('movements').find({}, { projection: { _id: 0 } }).toArray()
      const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)
      const totalValue = products.reduce((s, p) => s + (p.quantity || 0) * (p.price || 0), 0)
      // daily aggregate last 30 days
      const dayMap = {}
      const now = Date.now()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = { date: key, entrada: 0, saida: 0 }
      }
      movements.forEach(m => {
        const key = (m.at || '').slice(0, 10)
        if (dayMap[key]) {
          if (m.type === 'in') dayMap[key].entrada += m.quantity
          else dayMap[key].saida += m.quantity
        }
      })
      const series = Object.values(dayMap)
      // monthly demand projection using median of last 30 days daily outflow
      const outflows = series.map(s => s.saida).sort((a, b) => a - b)
      const median = outflows.length ? outflows[Math.floor(outflows.length / 2)] : 0
      const projectedMonthly = Math.round(median * 30)
      return json({
        totalProducts: products.length,
        totalStock,
        totalValue: Number(totalValue.toFixed(2)),
        series,
        projectedMonthly,
        medianDailyOut: median,
      })
    }

    return err('Rota não encontrada', 404)
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
