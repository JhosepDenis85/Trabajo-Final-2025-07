const { Router } = require('express');
const authJwt = require('../../middelwares/authJwt');
const controller = require('../../controllers/pasarela/pasarela.controller');

const router = Router();

router.get('/:userId/carrito', authJwt.verifyToken, controller.getCartForPayment);
router.post('/:userId/intent', authJwt.verifyToken, controller.processPayment);
router.patch('/:userId/estado', authJwt.verifyToken, controller.changeStatus);

router.get('/mi/carrito', authJwt.verifyToken, (req, res) => {
  req.params.userId = req.userId;
  controller.getCartForPayment(req, res);
});
router.post('/mi/intent', authJwt.verifyToken, (req, res) => {
  req.params.userId = req.userId;
  controller.processPayment(req, res);
});
router.patch('/mi/estado', authJwt.verifyToken, (req, res) => {
  req.params.userId = req.userId;
  controller.changeStatus(req, res);
});

module.exports = router;