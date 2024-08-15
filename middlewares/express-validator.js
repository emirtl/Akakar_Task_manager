const { body } = require("express-validator");

exports.userRegistrationValidation = [
  body("fullName")
    .trim()
    .not()
    .isEmpty()
    .withMessage("user cannot be empty.")
    .bail()
    .isLength({ min: 6, max: 20 })
    .withMessage("full name must be between 6 and 20 characters."),
  body("email")
    .trim()
    .not()
    .isEmpty()
    .withMessage("email cannot be empty")
    .bail()
    .isEmail()
    .withMessage("email is not valid"),
  body("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("password cannot be empty.")
    .bail()
    .isLength({ min: 8, max: 20 })
    .withMessage("password must be between 6 and 20 characters.")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
    )
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character."
    ),
];
