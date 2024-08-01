const express = require("express");

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
    cb(error, "public/uploads");
  },
  filename: (req, file, cb) => {
    const name = `${file.originalname.toLocaleLowerCase().split(".")[0]}`;
    const uniqueSuffix = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;
    const ext = MIME_TYPE[file.mimetype];
    cb(null, `${uniqueSuffix}-${name}.${ext}`);
  },
});

const router = express.Router();
const controller = require("../controllers/task");
const isAuth = require("../middlewares/isAuth");
const isEmployer = require("../middlewares/isEmployer");

router.get("/getAll", isAuth, controller.getAll);

router.get("/allTasksByUser/:id", isAuth, controller.allTasksByUser);

router.post(
  "/insert",
  isAuth,
  isEmployer,
  multer({ storage }).single("image"),
  controller.insert
);

router.put(
  "/update/:id",

  multer({ storage }).single("image"),
  controller.update
);

router.delete("/delete/:id", isAuth, isEmployer, controller.delete);

module.exports = router;
