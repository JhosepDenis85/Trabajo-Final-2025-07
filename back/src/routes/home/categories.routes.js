const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const { isAdmin } = require('../../middelwares/roles');
const controller = require('../../controllers/home/category.controller');

const router = Router();

// públicas (consulta)
router.get('/categories', controller.list);

// admin
router.post('/categories', authJwt.verifyToken, isAdmin, controller.create);
router.post('/categories/bulk', authJwt.verifyToken, isAdmin, controller.bulk);
router.put('/categories/:id', authJwt.verifyToken, isAdmin, controller.update);
router.delete('/categories/:id', authJwt.verifyToken, isAdmin, controller.remove);

module.exports = router;