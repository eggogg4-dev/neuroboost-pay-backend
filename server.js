import express from "express";
import axios from "axios";
import https from "https";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// ====== CORS FIX (ОБЯЗАТЕЛЬНО) ======
app.use(cors({
  origin: ["http://localhost:5173", "https://neuroboost.kz"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Обработка preflight вручную
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.sendStatus(200);
});
// ====================================

app.use(express.json());

// 1. Подключаем сертификаты Paymtech
const httpsAgent = new https.Agent({
  cert: fs.readFileSync(process.env.PAYMTECH_CERT_PATH || "./certs/cert.pem"),
  key: fs.readFileSync(process.env.PAYMTECH_KEY_PATH || "./certs/key.pem"),
  passphrase: process.env.PAYMTECH_PASSPHRASE,
  rejectUnauthorized: false
});

// 2. Создаём API-клиент Paymtech
const paymtech = axios.create({
  baseURL: process.env.PAYMTECH_BASE_URL || "https://sandboxapi.paymtech.kz",
  httpsAgent,
  auth: {
    username: process.env.PAYMTECH_USERNAME,
    password: process.env.PAYMTECH_PASSWORD
  }
});

// ====== ROUTES ======

app.post("/api/payment/create", async (req, res) => {
  try {
    const { amount, order_id } = req.body;

    const payload = {
      amount,
      currency: process.env.PAYMTECH_CURRENCY || "KZT",
      merchant_order_id: order_id,
      description: process.env.PAYMTECH_DESCRIPTION || "Оплата услуги на Neuroboost",
      options: {
        return_url: process.env.PAYMTECH_RETURN_URL || "https://neuroboost.kz/payment/result",
        language: process.env.PAYMTECH_LANGUAGE || "ru",
        auto_charge: 1
      }
    };

    const response = await paymtech.post("/orders/create", payload);

    const order = response.data.orders[0];
    const pay_url = response.headers.location;

    return res.json({
      success: true,
      order,
      pay_url
    });

  } catch (error) {
    console.log("Ошибка Paymtech:", error.response?.data || error.message);
    return res.status(400).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.get("/api/payment/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await paymtech.get(`/orders/${id}`);

    return res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ====== SERVER ======

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Neuroboost Pay Backend running on http://localhost:${PORT}`);
});
