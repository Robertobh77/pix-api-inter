// Forçando novo deploy no Render
const express = require('express'); // Rebuild for Render
const fs = require('fs');
const https = require('https');
const axios = require('axios');         
const path = require('path');           
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
app.get('/token', async (req, res) => {
  try {
    const certificado = fs.readFileSync(path.join(__dirname, 'certificados', 'certificado.crt'));
    const chave = fs.readFileSync(path.join(__dirname, 'certificados', 'chave.key'));

    const httpsAgent = new https.Agent({
      cert: certificado,
      key: chave
    });

    const response = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', null, {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: process.env.CLIENT_ID,
        password: process.env.CLIENT_SECRET
      },
      params: {
        grant_type: 'client_credentials',
        scope: 'cob.read cob.write pix.read pix.write webhook.read webhook.write'
      }
    });

    res.json({ token: response.data.access_token });
  } catch (error) {
    console.error('Erro ao obter token:', error.response?.data || error.message);
    res.status(500).json({ erro: 'Erro ao obter token do Inter' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Pix Inter rodando na porta ${PORT}`);
});
