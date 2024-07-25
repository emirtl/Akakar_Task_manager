const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, minLength: 6 },
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
    role: {
      type: [
        {
          type: String,
          enum: {
            values: ["employer", "employee", "admin", "owner"],
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
