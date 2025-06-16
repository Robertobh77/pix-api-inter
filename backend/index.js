const express = require('express');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

const certificado = fs.readFileSync('./certs/certificado.pem');
const chave = fs.readFileSync('./certs/chave.pem');

const httpsAgent = new https.Agent({
  cert: certificado,
  key: chave,
  rejectUnauthorized: false
});

let accessToken = null;

async function gerarAccessToken() {
  const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
  const response = await axios({
    method: 'POST',
    url: 'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
    data: 'grant_type=client_credentials',
    httpsAgent,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data.access_token;
}

app.post('/cobranca', async (req, res) => {
  try {
    const { txid, nome, cpf, valor } = req.body;

    if (!accessToken) {
      accessToken = await gerarAccessToken();
    }

    const data = {
      calendario: { expiracao: 3600 },
      devedor: { cpf, nome },
      valor: { original: valor.toFixed(2) },
      chave: process.env.CHAVE_PIX,
      solicitacaoPagador: 'Pagamento da cobranca'
    };

    const response = await axios({
      method: 'PUT',
      url: `https://cdpj.partners.bancointer.com.br/pix/v2/cob/${txid}`,
      httpsAgent,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data
    });

    const responseQr = await axios({
      method: 'GET',
      url: `https://cdpj.partners.bancointer.com.br/pix/v2/loc/${response.data.loc.id}/qrcode`,
      httpsAgent,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    res.json({
      txid,
      nome,
      cpf,
      valor,
      url: response.data.loc.location,
      qr_code: responseQr.data.qrcode,
      imagem_qr_code: responseQr.data.imagemQrcode
    });
  } catch (error) {
    console.error('Erro ao criar cobrança Pix:', error.response?.data || error.message);
    res.status(500).json({ erro: 'Erro ao criar cobrança Pix' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API Pix Inter rodando na porta ${PORT}`);
});
