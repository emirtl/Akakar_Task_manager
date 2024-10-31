const mongoose = require("mongoose");

const elevatorSchema = new mongoose.Schema(
  {
    task: {
      type: String,
    },
    isFinished: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const elevator = mongoose.model("elevator", elevatorSchema);

module.exports = elevator;
