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

router.get(
  "/getAll-companyUsers/:companyCode",
  isAuth,
  controller.getAllCompanyUsers
); // TODO: minor admin middleware to be added

router.get("/user/:id", isAuth, controller.user);

router.post("/register", userRegistrationValidation, controller.register); //TODO to be deleted

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

router.get("/verifiedAccount/:token", controller.verifiedAccount); //TODO to be deleted

router.get("/newVerifiedAccount/:token", controller.newVerifiedAccount);

router.get("/employeeRegistration/:token", controller.employeeRegistration);

router.delete("/delete/:id", isAuth, isEmployer, controller.deleteUser);

router.post(
  "/new-register",
  userRegistrationValidation,
  controller.newRegister
); //*!  Should be as new register

module.exports = router;
