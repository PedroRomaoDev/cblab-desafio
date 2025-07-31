import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import {
  makeProcessDataController,
  makeQueryDataController,
  makeItemQueryController,
  makeRawDataController,
} from './src/factories/controllers/index.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

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

// rota para obter dados da Raw Zone (GET /raw-zone)
app.get('/raw-data', async (req, res) => {
  // Instanciação DENTRO da rota usando a fábrica
  const rawZoneController = makeRawDataController();
  await rawZoneController.getRawData(req, res);
});

// rota para processar dados (POST /process-data)
app.post('/process-data', async (req, res) => {
  const processDataController = makeProcessDataController();
  await processDataController.execute(req, res);
});

// rota para buscar dados processados de um tipo de API específico (POST /query/:apiName)
app.post('/query/:apiName', async (req, res) => {
  const queryDataController = makeQueryDataController();
  await queryDataController.execute(req, res);
});

// rota para buscar um item específico por ID (POST /query/item)
app.post('/item-lookup', async (req, res) => {
  // Adicionado 'async'
  const itemQueryController = makeItemQueryController();
  await itemQueryController.execute(req, res);
});

//SWAGGER
const __dirname = path.resolve();
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, './docs/swagger.json'), 'utf8'),
);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Server Swagger UI
//localhost:3001/docs

// --- Endpoints de API Simulados ---

// POST /bi/getFiscalInvoice
app.post('/bi/getFiscalInvoice', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: uuidv4(),
      busDt: busDt,
      storeId: storeId,
      invoiceNumber: `INV-${busDt.replace(/-/g, '')}-001`,
      totalAmount: 150.75,
      taxes: 15.07,
      source: 'FiscalInvoice',
    },
    {
      id: uuidv4(),
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

// POST /res/getGuestChecks
app.post('/res/getGuestChecks', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: uuidv4(),
      busDt: busDt,
      storeId: storeId,
      guestCheckId: `GC-${busDt.replace(/-/g, '')}-001A`,
      total: 50.25,
      items: [
        { menuItemId: 'PIZZA_MARG', quantity: 1, price: 40.0 },
        { menuItemId: 'REFRIGERANTE', quantity: 1, price: 10.25 },
      ],
      taxes: 5.0,
      serviceCharge: 5.02,
      source: 'GuestChecks',
    },
    {
      id: uuidv4(),
      busDt: busDt,
      storeId: storeId,
      guestCheckId: `GC-${busDt.replace(/-/g, '')}-001B`,
      total: 100.5,
      items: [
        { menuItemId: 'PASTA_ALFREDO', quantity: 2, price: 45.0 },
        { menuItemId: 'SUCO', quantity: 1, price: 10.5 },
      ],
      taxes: 10.0,
      serviceCharge: 10.05,
      source: 'GuestChecks',
    },
    {
      id: uuidv4(),
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

// POST /org/getChargeBack
app.post('/org/getChargeBack', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: uuidv4(),
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

// POST /trans/getTransactions
app.post('/trans/getTransactions', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: uuidv4(),
      busDt: busDt,
      storeId: storeId,
      transactionId: `TRX-${busDt.replace(/-/g, '')}-001`,
      type: 'SALE',
      value: 150.75,
      paymentMethod: 'Credit Card',
      source: 'Transactions',
    },
    {
      id: uuidv4(),
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

// POST /inv/getCashManagementDetails
app.post('/inv/getCashManagementDetails', validatePayload, (req, res) => {
  const { busDt, storeId } = req.body;
  const data = [
    {
      id: uuidv4(),
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

// inicia o servidor
app.listen(PORT, () => {
  console.log(`Express API server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});
