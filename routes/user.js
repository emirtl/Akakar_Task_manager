const express = require("express");
const path = require("path");
const router = express.Router();
const controller = require("../controllers/user");
const {
  userRegistrationValidation,
} = require("../middlewares/express-validator");
const isAuth = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");
const isOwner = require("../middlewares/isOwner");
const isAdminMajor = require("../middlewares/isAdminMajor");
const isOwnerMajor = require("../middlewares/isOwnerMajor");
//multer
const multer = require("multer");

const MIME_TYPE = {
  "image/jpg": "jpg",
  "image/png": "png",
  "image/jpeg": "jpg",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPE[file.mimetype];
    let error = new Error("file format is not an image");
    if (isValid) {
      error = null;
    }
    cb(error, path.join(__dirname, "../", "public/uploads"));
  },

  //  cb(error, "public/uploads");
  //  path.join(__dirname, 'public/uploads')
  filename: (req, file, cb) => {
    const name = `${file.originalname.toLocaleLowerCase().split(".")[0]}`;
    const uniqueSuffix = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;
    const ext = MIME_TYPE[file.mimetype];
    cb(null, `${uniqueSuffix}-${name}.${ext}`);
  },
});

router.post("/register", userRegistrationValidation, controller.register);

router.post("/login", controller.login);

router.get("/getAll", isAuth, isAdminMajor, controller.users);

router.get(
  "/getAll-companyUsers/:companyCode",
  isAuth,
  isAdmin,
  controller.getAllCompanyUsers
);

router.get("/user/:id", isAuth, controller.user);

router.put(
  "/upload-userImage/:id",
  isAuth,
  multer({ storage }).single("userImage"),
  controller.uploadUserImage
);

// router.put("/remove-userImage/:id", isAuth, controller.removeUserImage);

router.put(
  "/upgrade-to-majorAdmin/:id",
  isAuth,
  isOwnerMajor,
  controller.upgradeToMajorAdmin
);

router.put(
  "/degrade-to-user/:id",
  isAuth,
  isOwnerMajor,
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
  isAdminMajor,
  controller.deleteUserByMajor
);

router.put("/change-password/:id", isAuth, controller.updateUserPassword);

router.put("/update-user/:id", isAuth, controller.updateUser);

router.post("/forgot-password", controller.forgotPassword);

router.get("/verifiedAccount/:token", controller.verifiedAccount);

module.exports = router;

// check deleted user group memeber with tasks
