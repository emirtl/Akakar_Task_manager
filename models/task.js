const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, minLength: 6 },

    description: {
      type: String,
      minLength: 10,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["incomplete", "in progress", "completed"],
        message: "{VALUE} is not supported",
      },
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: ["high", "medium", "low"],
        message: "{VALUE} is not supported",
      },
    },
    rate: { type: Number, default: 2.5 },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
