const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const controller = require('../../controllers/checkout/checkout.controller');

const router = Router();

// Items del carrito por usuario
router.get('/:userId/items', authJwt.verifyToken, controller.getItems);
router.post('/:userId/items', authJwt.verifyToken, controller.addOrUpdateItem);
router.delete('/:userId/items/:itemId', authJwt.verifyToken, controller.removeItem);

// Validación de cupones
router.post('/:userId/validate-coupon', authJwt.verifyToken, controller.validateCoupon);

// Selección de entrega
router.post('/:userId/delivery', authJwt.verifyToken, controller.setDelivery);

// Selección de método de pago
router.post('/:userId/payment', authJwt.verifyToken, controller.setPayment);

// Resumen final
router.get('/:userId/summary', authJwt.verifyToken, controller.getSummary);

module.exports = router;