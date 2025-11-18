require('dotenv').config();

const PORT = process.env.PORT || 8080;
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieSesion = require('cookie-session');


const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({windowMs: 60_000, max: 100});

app.use('/api/', limiter);
app.use(
    cookieSesion({
        name: "auth-session",
        keys: [process.env.COOKIE_SECRET],
        httpOnly:true
}));

require('./src/routes/auth.routes')(app);
require('./src/routes/user.routes')(app);

app.get('/',(req,res)=>{
    res.send('Hola Jhosep');
})

const db = require('./src/models');

db.mongoose.connect(process.env.MONGO_URI,{}).then(()=>{
    console.log("Estas conectado");
    db.init();
}).catch((error)=>{
    console.log(error)
    process.error(error);
    process.exit();
})



app.listen(PORT, ()=>{
    console.log(`Servidor iniciado en el puerto ${PORT}`);
})