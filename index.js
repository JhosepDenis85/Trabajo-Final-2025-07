require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const passport = require('./src/config/passport');
const authRoutes = require('./src/routes/auth.routes');

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

// Todas las rutas bajo /api
app.use('/api', authRoutes);

app.get('/', (_req, res) => res.send('API escuchando'));

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});