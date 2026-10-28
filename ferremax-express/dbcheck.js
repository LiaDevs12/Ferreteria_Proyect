import { pool } from './db.js'
const [t] = await pool.query('SHOW TABLES')
console.log(`Conectado a ${process.env.DB_NAME}: ${t.length} tablas`)
const [[p]] = await pool.query('SELECT COUNT(*) AS n FROM productos')
console.log(`Productos en la base: ${p.n}`)
await pool.end()
