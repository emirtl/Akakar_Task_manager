const express = require("express");

const router = express.Router();
const controller = require("../controllers/elevator");

router.get("/getAll", controller.getAll);

router.post("/insert", controller.insert);

router.put("/update/:id", controller.update);

module.exports = router;
