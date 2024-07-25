const express = require("express");

const router = express.Router();
const controller = require("../controllers/user");
const {
  userRegistrationValidation,
} = require("../middlewares/express-validator");
const isAuth = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");
const isOwner = require("../middlewares/isOwner");
const isEmployer = require("../middlewares/isEmployer");

router.get("/getAll", isAuth, isAdmin, controller.users);

router.post("/register", userRegistrationValidation, controller.register);

router.post("/login", controller.login);

router.post(
  "/inviteEmployee/:id",
  isAuth,
  isEmployer,
  controller.inviteEmployee
);

router.put("/upgrade-to-admin/:id", isAuth, isOwner, controller.upgradeToAdmin);

router.put("/degrade-to-user/:id", isAuth, isOwner, controller.degradeToUser);

router.put("/change-password/:id", isAuth, controller.updateUserPassword);

router.get("/verifiedAccount/:token", controller.verifiedAccount);

router.get("/employeeRegistration/:token", controller.employeeRegistration);

router.delete("/delete/:id", isAuth, isEmployer, controller.deleteUser);

module.exports = router;
