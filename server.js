const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Sirve index.html

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index (1).html"));
});

app.post("/api/cotizar", async (req, res) => {
  const { origenPostalCode, destinoPostalCode, peso, dimensiones } = req.body;

  if (!origenPostalCode || !destinoPostalCode || !peso || !dimensiones) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const response = await axios.post(
      "https://apis-sandbox.fedex.com/rate/v1/rates/quotes",
      {
        accountNumber: {
          value: process.env.FEDEX_ACCOUNT_NUMBER,
        },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: origenPostalCode,
              countryCode: "CN",
            },
          },
          recipient: {
            address: {
              postalCode: destinoPostalCode,
              countryCode: "AR",
            },
          },
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          serviceType: "INTERNATIONAL_PRIORITY",
          packagingType: "YOUR_PACKAGING",
          totalPackageWeight: {
            units: "KG",
            value: peso,
          },
          requestedPackageLineItems: [
            {
              weight: {
                units: "KG",
                value: peso,
              },
              dimensions: {
                length: dimensiones[0],
                width: dimensiones[1],
                height: dimensiones[2],
                units: "CM",
              },
            },
          ],
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-locale": "es_AR",
          Authorization: `Bearer ${process.env.FEDEX_API_KEY}`,
        },
      }
    );

    const rate = response.data.output.rateReplyDetails[0];
    const monto = rate.ratedShipmentDetails[0].totalNetChargeWithDutiesAndTaxes.amount;
    const tiempoEntrega = rate.commit?.daysInTransit ? `${rate.commit.daysInTransit} días` : "N/D";

    res.json({
      costo: monto,
      tiempo: tiempoEntrega,
    });
  } catch (error) {
    console.error("Error al cotizar:", error?.response?.data || error.message);
    res.status(500).json({ error: "No se pudo obtener la cotización." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Easy Coti backend activo en puerto ${PORT}`);
});

