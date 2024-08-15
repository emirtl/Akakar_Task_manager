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
const isMajorOwner = require("../middlewares/isMajorOwner");

router.get("/getAll", isAuth, isAdmin, controller.users);

router.get(
  "/getAll-companyUsers/:companyCode",
  isAuth,
  controller.getAllCompanyUsers
); // TODO: minor admin middleware to be added

router.get("/user/:id", isAuth, controller.user);

router.post("/register", userRegistrationValidation, controller.register); //TODO to be deleted

router.post("/login", controller.login);

// router.post(
//   "/inviteEmployee/:id",
//   isAuth,
//   isEmployer,
//   controller.inviteEmployee
// );

router.put(
  "/upgrade-to-majorAdmin/:id",
  isAuth,
  isMajorOwner,
  controller.upgradeToMajorAdmin
);

router.put(
  "/degrade-to-user/:id",
  isAuth,
  isMajorOwner,
  controller.degradeMajorAdminToUser
);

router.put(
  "/upgrade-To-CompanyAdmin/:id",
  isOwner,
  controller.upgradeToCompanyAdmin
);

router.put(
  "/degrade-To-CompanyAdmin/:id",
  isOwner,
  controller.degradeToCompanyUser
);

router.delete("/delete/:id", isAuth, isEmployer, controller.deleteUserByMajor); //TODO needs to be change

router.put("/change-password/:id", isAuth, controller.updateUserPassword);

router.get("/verifiedAccount/:token", controller.verifiedAccount); //TODO to be deleted

// router.get("/newVerifiedAccount/:token", controller.newVerifiedAccount); //*!  Should be as new verification account method

// router.get("/employeeRegistration/:token", controller.employeeRegistration); //*!  Should be deleted

// router.post(
//   "/new-register",
//   userRegistrationValidation,
//   controller.newRegister
// ); //*!  Should be as new register

module.exports = router;
