// DATOS DE DEMOSTRACIÓN: no son precios, marcas ni inventario oficiales de Ferremax.
// Punto único a sustituir por la base de datos / API del módulo administrativo.
export const categories = [['manuales','Herramientas manuales'],['electricas','Herramientas eléctricas'],['tornilleria','Tornillería y fijación'],['cerraduras','Cerraduras y herrajes'],['electrico','Material eléctrico'],['plomeria','Plomería'],['pinturas','Pinturas y accesorios'],['abrasivos','Abrasivos y carpintería']].map(([id, name]) => ({ id, name }))
const P = (id, name, categoryId, brand, price, stock, featured, image) => ({ id, sku: `DEMO-${id.toUpperCase()}`, name, description: `${name}. Producto de demostración.`, price, image, categoryId, brand, stock, featured: !!featured })
export const products = [
  P('m1','Martillo de uña 16 oz','manuales','Marca A',159,25,1,'🔨'), P('m2','Juego de desarmadores 6 pzas','manuales','Marca B',219,12,0,'🪛'),
  P('e1','Taladro percutor 1/2"','electricas','Marca C',1299,6,1,'🛠️'), P('e2','Esmeriladora angular 4-1/2"','electricas','Marca C',999,0,0,'⚙️'),
  P('t1','Caja de tornillos 100 pzas','tornilleria','Marca A',89,100,0,'🔩'), P('c1','Candado de acero 40 mm','cerraduras','Marca D',129,30,1,'🔒'),
  P('l1','Cable cal. 12 (rollo 100 m)','electrico','Marca E',1099,8,0,'💡'), P('p1','Llave mezcladora cromada','plomeria','Marca F',459,10,0,'🚰'),
  P('pi1','Pintura vinílica blanca 19 L','pinturas','Marca G',1190,14,1,'🎨'), P('a1','Lija de agua grano 220 (5 pzas)','abrasivos','Marca B',59,60,0,'🧱')]
