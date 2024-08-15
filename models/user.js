const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true, // Ensures no duplicate emails
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
    companyCode: { type: String },

    jobTitle: {
      type: String,
    },
    city: { type: String },
    province: { type: String },
    address: {
      type: String,
    },
    phone: { type: String, required: true },
    role: {
      type: [
        {
          type: String,
          enum: {
            values: [
              "employer",
              "employee",
              "admin",
              "owner",
              "majorOwner",
              "majorAdmin",
            ],
            message: "{VALUE} is not supported",
          },
        },
      ],
    },
    isEmaiLVerified: { type: Boolean, default: false, required: true },
    referals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    token: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
