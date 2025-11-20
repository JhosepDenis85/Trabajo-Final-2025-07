require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const passport = require('./src/config/passport');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');

// Rutas HOME (Alcance 2)
const homeCategoryRoutes = require('./src/routes/home/categories.routes');
const homeProductRoutes = require('./src/routes/home/products.routes');
const homeCouponRoutes = require('./src/routes/home/coupons.routes');

// NUEVO: Checkout (Alcance 3)
const checkoutRoutes = require('./src/routes/checkout/checkout.routes');
const checkoutController = require('./src/controllers/checkout/checkout.controller');

const PORT = process.env.PORT || 6969;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'cookie';

mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((e) => console.error('Error MongoDB', e));

const app = express();
app.use(express.json());

app.use(
  session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// API REGISTRO (Alcance 1)
app.use('/api', authRoutes);
app.use('/api', userRoutes);

// API HOME (Alcance 2)
app.use('/api/home', homeCategoryRoutes);
app.use('/api/home', homeProductRoutes);
app.use('/api/home', homeCouponRoutes);

// API CHECKOUT (Alcance 3)
app.use('/api/checkout', checkoutRoutes);
app.get('/api/payment-methods', checkoutController.getPaymentMethods);

app.get('/', (_req, res) => res.send('API escuchando'));

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});