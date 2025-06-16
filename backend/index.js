// index.js atualizado com correção no campo valor.original como string
const express = require('express');
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
    const certificado = fs.readFileSync(path.join(__dirname, 'certificados', 'certificado.crt'));
    const chave = fs.readFileSync(path.join(__dirname, 'certificados', 'chave.key'));

    const httpsAgent = new https.Agent({
      cert: certificado,
      key: chave
    });

    const responseToken = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', null, {
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
        scope: 'cob.write'
      }
    });

    const token = responseToken.data.access_token;

    const { txid, nome, valor } = req.body;

    const responseCobranca = await axios.put(
      `https://cdpj.partners.bancointer.com.br/pix/v2/cob/${txid}`,
      {
        calendario: { expiracao: 3600 },
        devedor: { nome },
        valor: { original: String(parseFloat(valor).toFixed(2)) },
        chave: process.env.CHAVE_PIX,
        solicitacaoPagador: 'Pagamento do pedido.'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const { loc, qr_code } = responseCobranca.data;

    res.json({
      txid,
      nome,
      valor,
      url: loc.location,
      qr_code: qr_code
    });
  } catch (error) {
    console.error('Erro ao criar cobrança Pix:', {
      data: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message
    });
    res.status(500).json({ erro: 'Erro ao criar cobrança Pix' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Pix Inter rodando na porta ${PORT}`);
});
