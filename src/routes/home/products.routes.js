const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const { isAdmin } = require('../../middelwares/roles');
const controller = require('../../controllers/home/product.controller');

const router = Router();

// públicas (búsqueda, filtros y detalle)
router.get('/products', controller.list);
router.get('/products/:id', controller.getById);

// admin (CRUD)
router.post('/products', authJwt.verifyToken, isAdmin, controller.create);
router.post('/products/bulk', authJwt.verifyToken, isAdmin, controller.bulkUpsert);
router.put('/products/:id', authJwt.verifyToken, isAdmin, controller.update);
router.delete('/products/:id', authJwt.verifyToken, isAdmin, controller.remove);

module.exports = router;