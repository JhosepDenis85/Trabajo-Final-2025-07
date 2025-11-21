const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const { isAdmin } = require('../../middelwares/roles');
const controller = require('../../controllers/home/coupon.controller');

const router = Router();

// públicas
router.get('/coupons', controller.list);
router.get('/coupons/:code', controller.getByCode);
router.post('/coupons/validate', controller.validate);

// admin
router.post('/coupons', authJwt.verifyToken, isAdmin, controller.create);
router.put('/coupons/:id', authJwt.verifyToken, isAdmin, controller.update);
router.delete('/coupons/:id', authJwt.verifyToken, isAdmin, controller.remove);

module.exports = router;