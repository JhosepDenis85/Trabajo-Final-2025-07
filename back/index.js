require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('./src/config/passport');
const { createRoles } = require('./src/models');
const morgan = require('morgan');

const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const homeCategoryRoutes = require('./src/routes/home/categories.routes');
const homeProductRoutes = require('./src/routes/home/products.routes');
const homeCouponRoutes = require('./src/routes/home/coupons.routes');
const checkoutRoutes = require('./src/routes/checkout/checkout.routes');
const checkoutController = require('./src/controllers/checkout/checkout.controller');
const pasarelaRoutes = require('./src/routes/pasarela/pasarela.routes');
const misComprasRoutes = require('./src/routes/miscompras/miscompras.routes'); // <-- agregado

const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 6969;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'cookie';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [ FRONTEND_URL, 'http://localhost:5173' ];

mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB conectado');
    if (createRoles) {
      try { await createRoles(); } catch (e) { console.warn('Seed roles fallo:', e.message); }
    }
    startServer();
  })
  .catch(e => console.error('Error MongoDB', e));

function startServer() {
  const app = express();

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS bloqueado'));
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(express.static(path.join(__dirname, 'src/public')));

  app.use('/api', authRoutes);
  app.use('/api', userRoutes);

  app.use('/api/home', homeCategoryRoutes);
  app.use('/api/home', homeProductRoutes);
  app.use('/api/home', homeCouponRoutes);

  app.use('/api/checkout', checkoutRoutes);
  app.get('/api/payment-methods', checkoutController.getPaymentMethods);

  app.use('/api/pasarela', pasarelaRoutes);

  app.use('/api/mis-compras', misComprasRoutes); // <-- agregado

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get(['/success', '/api/auth/success'], (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public/success.html'));
  });

  app.get('/', (req, res) => {
    if (req.query.token) {
      return res.sendFile(path.join(__dirname, 'src/public/success.html'));
    }
    res.send('API escuchando');
  });

  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}