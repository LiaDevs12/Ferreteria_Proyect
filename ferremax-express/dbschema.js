import { pool } from './db.js'
const want = ['productos','categorias','marcas','existencias','imagenes_producto','usuarios','clientes','pedidos','detalle_pedido']
const [cols] = await pool.query(
  `SELECT table_name t, column_name c, column_type ty, is_nullable n, column_default d, extra e
   FROM information_schema.columns WHERE table_schema = ? AND table_name IN (?) ORDER BY table_name, ordinal_position`, [process.env.DB_NAME, want])
const [fks] = await pool.query(
  `SELECT table_name t, column_name c, referenced_table_name rt, referenced_column_name rc
   FROM information_schema.key_column_usage WHERE table_schema = ? AND referenced_table_name IS NOT NULL AND table_name IN (?)`, [process.env.DB_NAME, want])
for (const t of want) {
  console.log(`\n== ${t}`)
  cols.filter(x => x.t === t).forEach(x => console.log(`  ${x.c} ${x.ty}${x.n === 'NO' ? ' NOT NULL' : ''}${x.d != null ? ' DEFAULT ' + x.d : ''}${x.e ? ' ' + x.e : ''}`))
  fks.filter(x => x.t === t).forEach(x => console.log(`  FK ${x.c} -> ${x.rt}.${x.rc}`))
}
await pool.end()
