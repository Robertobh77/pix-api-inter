const express = require('express');
const fs = require('fs');
const https = require('https');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('API Pix Inter está online');
});

app.post('/cobranca', (req, res) => {
    res.json({
        txid: req.body.txid || 'simulado',
        nome: req.body.nome || 'Cliente',
        valor: req.body.valor || 0,
        url: 'https://qrcode.simulado/pix=123abc',
        qr_code: '000201....52040000...'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Pix Inter rodando na porta ${PORT}`);
});
