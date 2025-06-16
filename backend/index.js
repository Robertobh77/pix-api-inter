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

app.post('/cobranca', async (req, res) => {
  try {
    const { txid, nome, valor } = req.body;

    const certificado = fs.readFileSync(path.join(__dirname, 'certificados', 'certificado.crt'));
    const chave = fs.readFileSync(path.join(__dirname, 'certificados', 'chave.key'));

    const httpsAgent = new https.Agent({
      cert: certificado,
      key: chave
    });

    const tokenResponse = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', null, {
      httpsAgent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: process.env.CLIENT_ID,
        password: process.env.CLIENT_SECRET
      },
      params: {
        grant_type: 'client_credentials',
        scope: 'cob.write cob.read pix.read pix.write'
      }
    });

    const token = tokenResponse.data.access_token;

    const response = await axios.put(
      `https://cdpj.partners.bancointer.com.br/pix/v2/cob/${txid}`,
      {
        calendario: { expiracao: 3600 },
        devedor: { nome },
        valor: { original: valor.toFixed(2) },
        chave: process.env.PIX_KEY,
        solicitacaoPagador: 'Pagamento gerado via API Pix'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const location = response.data.loc.id;

    const qrcodeResponse = await axios.get(
      `https://cdpj.partners.bancointer.com.br/pix/v2/loc/${location}/qrcode`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        httpsAgent
      }
    );

    res.json({
      txid,
      nome,
      valor,
      url: qrcodeResponse.data.imagemQrcode,
      qr_code: qrcodeResponse.data.qrcode
    });

  } catch (error) {
    console.error('Erro ao criar cobrança:', error.response?.data || error.message);
    res.status(500).json({ erro: 'Erro ao criar cobrança Pix' });
  }
});app.get('/token', async (req, res) => {
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
