const Elevator = require("../models/elevator");

exports.getAll = async (req, res) => {
  try {
    const models = await Elevator.find({}).exec();
    if (!models) {
      return res.status(500).json({ error: "something went erong" });
    }
    return res.status(200).json({ models });
  } catch (error) {
    return res.status(500).json({ error: "something went erong", error });
  }
};

exports.insert = async (req, res) => {
  try {
    let elevator = new Elevator({
      task: req.body.task,
      isFinished: req.body.isFinished,
    });
    elevator = await elevator.save();
    if (!elevator) {
      return res.status(500).json({ error: "something went erong" });
    }
    return res.status(201).json({ elevator });
  } catch (error) {
    return res.status(500).json({ error: "something went erong", error });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const model = await Elevator.findByIdAndUpdate(id, {
      isFinished: req.body.isFinished,
    });

    if (!model) {
      return res.status(500).json({ error: "something went erong" });
    }

    return res.status(200).json({ model });
  } catch (error) {
    return res.status(500).json({ error: "something went erong", error });
  }
};
