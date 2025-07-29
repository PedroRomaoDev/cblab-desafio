import express from 'express';
import bodyParser from 'body-parser';
import { makeProcessDataController } from './src/factories/controllers/process-data.js';
import { makeQueryDataController } from './src/factories/controllers/query-data.js'; // Importa a fábrica para QueryData
import { makeItemQueryController } from './src/factories/controllers/item-query.js'; // Importa a fábrica para ItemQuery

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - Payload:`,
    req.body,
  );
  next();
});

// --- rota para healthcheck do docker ---
app.get('/', (req, res) => {
  res.status(200).json({ status: 'API is running and healthy' });
});

const validatePayload = (req, res, next) => {
  const { busDt, storeId } = req.body;
  if (!busDt || !storeId) {
    return res
      .status(400)
      .json({ error: 'busDt and storeId are required in the payload.' });
  }
  next();
};

app.post('/processarDados', async (req, res) => {
  // Adicionado 'async' aqui
  const processDataController = makeProcessDataController(); // Instanciação DENTRO da rota
  await processDataController.execute(req, res); // Chama o método execute
});

// Rota para buscar dados processados de um tipo de API específico (POST /query/:apiName)
app.post('/query/:apiName', async (req, res) => {
  // Adicionado 'async'
  const queryDataController = makeQueryDataController(); // Instanciação DENTRO da rota
  await queryDataController.execute(req, res); // Chama o método execute
});

// Rota para buscar um item específico por ID (POST /query/item)
app.post('/query/item', async (req, res) => {
  // Adicionado 'async'
  const itemQueryController = makeItemQueryController(); // Instanciação DENTRO da rota
  await itemQueryController.execute(req, res); // Chama o método execute
});

// --- Endpoints de API Simulados ---

// 1. POST /bi/getFiscalInvoice
app.post('/bi/getFiscalInvoice', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: `fi-${storeId}-${busDt}-001`,
      busDt: busDt,
      storeId: storeId,
      invoiceNumber: `INV-${busDt.replace(/-/g, '')}-001`,
      totalAmount: 150.75,
      taxes: 15.07,
      source: 'FiscalInvoice',
    },
    {
      id: `fi-${storeId}-${busDt}-002`,
      busDt: busDt,
      storeId: storeId,
      invoiceNumber: `INV-${busDt.replace(/-/g, '')}-002`,
      totalAmount: 200.0,
      taxes: 20.0,
      source: 'FiscalInvoice',
    },
  ];
  res.json(data);
});

// 2. POST /res/getGuestChecks
app.post('/res/getGuestChecks', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: `gc-${storeId}-${busDt}-001`,
      busDt: busDt,
      storeId: storeId,
      guestCheckId: `GC-${busDt.replace(/-/g, '')}-001A`,
      total: 50.25,
      items: [
        { menuItemId: 'PIZZA_MARG', quantity: 1, price: 40.0 },
        { menuItemId: 'REFRIGERANTE', quantity: 1, price: 10.25 },
      ],
      taxation: 5.0,
      serviceCharge: 5.02,
      source: 'GuestChecks',
    },
    {
      id: `gc-${storeId}-${busDt}-002`,
      busDt: busDt,
      storeId: storeId,
      guestCheckId: `GC-${busDt.replace(/-/g, '')}-001B`,
      total: 100.5,
      items: [
        { menuItemId: 'PASTA_ALFREDO', quantity: 2, price: 45.0 },
        { menuItemId: 'SUCO', quantity: 1, price: 10.5 },
      ],
      taxation: 10.0,
      serviceCharge: 10.05,
      source: 'GuestChecks',
    },
    {
      id: `gc-${storeId}-${busDt}-003-legacy`,
      busDt: busDt,
      storeId: storeId,
      guestCheckId: `GC-${busDt.replace(/-/g, '')}-001C-LEGACY`,
      total: 75.0,
      items: [
        { menuItemId: 'SALADA', quantity: 1, price: 30.0 },
        { menuItemId: 'AGUA', quantity: 2, price: 5.0 },
      ],
      taxes: 7.5,
      serviceCharge: 7.5,
      source: 'GuestChecks',
    },
  ];
  res.json(data);
});

// 3. POST /org/getChargeBack
app.post('/org/getChargeBack', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: `cb-${storeId}-${busDt}-001`,
      busDt: busDt,
      storeId: storeId,
      chargeBackId: `CB-${busDt.replace(/-/g, '')}-001`,
      amount: 25.0,
      reason: 'Customer dispute',
      source: 'ChargeBack',
    },
  ];
  res.json(data);
});

// 4. POST /trans/getTransactions
app.post('/trans/getTransactions', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: `tr-${storeId}-${busDt}-001`,
      busDt: busDt,
      storeId: storeId,
      transactionId: `TRX-${busDt.replace(/-/g, '')}-001`,
      type: 'SALE',
      value: 150.75,
      paymentMethod: 'Credit Card',
      source: 'Transactions',
    },
    {
      id: `tr-${storeId}-${busDt}-002`,
      busDt: busDt,
      storeId: storeId,
      transactionId: `TRX-${busDt.replace(/-/g, '')}-002`,
      type: 'REFUND',
      value: -20.0,
      paymentMethod: 'Cash',
      source: 'Transactions',
    },
  ];
  res.json(data);
});

// 5. POST /inv/getCashManagementDetails
app.post('/inv/getCashManagementDetails', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: `cm-${storeId}-${busDt}-001`,
      busDt: busDt,
      storeId: storeId,
      cashIn: 500.0,
      cashOut: 100.0,
      deposit: 400.0,
      cashierName: 'Pedro Henrique',
      source: 'CashManagementDetails',
    },
  ];
  res.json(data);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Express API server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});
