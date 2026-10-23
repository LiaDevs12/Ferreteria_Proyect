
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.json({
        proyecto: 'FerreMax',
        mensaje: 'API funcionando correctamente',
        tecnologia: 'Node.js y Express'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        estado: 'activo',
        baseDatos: 'pendiente de configurar'
    });
});

app.listen(PORT, () => {
    console.log(`Servidor FerreMax disponible en http://localhost:${PORT}`);
});
