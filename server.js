
// server.js – Backend Easy Coti + FedEx API
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Obtener token de acceso
async function getFedExToken() {
  const res = await axios.post(
    'https://apis-sandbox.fedex.com/oauth/token',
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FEDEX_API_KEY,
      client_secret: process.env.FEDEX_API_SECRET
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

// Endpoint cotización
app.post('/api/cotizar', async (req, res) => {
  const { origenPostalCode, destinoPostalCode, peso, dimensiones } = req.body;

  try {
    const token = await getFedExToken();
    const response = await axios.post(
      'https://apis-sandbox.fedex.com/rate/v1/rates/quotes',
      {
        accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
        requestedShipment: {
          shipper: { address: { postalCode: origenPostalCode, countryCode: 'CN' } },
          recipient: { address: { postalCode: destinoPostalCode, countryCode: 'AR' } },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          rateRequestType: ['ACCOUNT'],
          requestedPackageLineItems: [
            {
              weight: { units: 'KG', value: peso },
              dimensions: {
                length: dimensiones.largo,
                width: dimensiones.ancho,
                height: dimensiones.alto,
                units: 'CM'
              }
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const tarifas = response.data.output.rateReplyDetails.map(rate => ({
      tipoEnvio: rate.serviceType,
      costo: rate.ratedShipmentDetails[0].totalNetChargeWithDutiesAndTaxes.amount,
      moneda: rate.ratedShipmentDetails[0].totalNetChargeWithDutiesAndTaxes.currency,
      tiempoEntrega: rate.commit?.daysInTransit ? `${rate.commit.daysInTransit} días` : 'N/D'
    }));

    res.json({ tarifas });
  } catch (error) {
    console.error('Error cotizando:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al obtener cotización', detalle: error.response?.data || error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Easy Coti FedEx API backend funcionando ✅');
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
