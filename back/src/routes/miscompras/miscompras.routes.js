const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const controller = require('../../controllers/miscompras/miscompras.controller');

const router = Router();

// API - Mis Compras (GET Compras realizadas - Estados)
router.get('/', authJwt.verifyToken, controller.getMisCompras);

module.exports = router;