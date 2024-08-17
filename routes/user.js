const express = require("express");

const router = express.Router();
const controller = require("../controllers/user");
const {
  userRegistrationValidation,
} = require("../middlewares/express-validator");
const isAuth = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");
const isOwner = require("../middlewares/isOwner");
const isMajorOwner = require("../middlewares/isMajorOwner");
const isMajorAdmin = require("../middlewares/isMajorAdmin");

router.get("/getAll", isAuth, isMajorAdmin, controller.users);

router.post("/register", userRegistrationValidation, controller.register); //TODO to be deleted

router.post("/login", controller.login);

router.get(
  "/getAll-companyUsers/:companyCode",
  isAuth,
  isAdmin,
  controller.getAllCompanyUsers
);

router.get("/user/:id", isAuth, controller.user);

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
  "/upgrade-to-companyAdmin/:id",
  isAuth,
  isOwner,
  controller.upgradeToCompanyAdmin
);

router.put(
  "/degrade-To-CompanyUser/:id",
  isAuth,
  isOwner,
  controller.degradeToCompanyUser
);

router.delete(
  "/delete-companyMember/:id",
  isAuth,
  isAdmin,
  controller.deleteCompanyMember
);

router.delete(
  "/delete/:id",
  isAuth,
  isMajorAdmin,
  controller.deleteUserByMajor
);

router.put("/change-password/:id", isAuth, controller.updateUserPassword);

router.get("/verifiedAccount/:token", controller.verifiedAccount);

module.exports = router;

// check deleted user group memeber with tasks
