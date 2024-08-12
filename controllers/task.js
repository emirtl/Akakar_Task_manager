const Task = require("../models/task");
const User = require("../models/user");

const mongoose = require("mongoose");

exports.getAll = async (req, res) => {
  try {
    const tasks = await Task.find().populate("user", "-password").exec();
    if (tasks.length <= 0) {
      return res.status(200).json({ message: "no task found" });
    }
    if (!tasks) {
      return res
        .status(500)
        .json({ error: "loading tasks failed, please try later" });
    }
    return res.status(200).json({ tasks });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "loading tasks failed. please try later", error });
  }
};

exports.insert = async (req, res) => {
  try {
    const { title, description, status, date, user, priority } = req.body;
    if (!title || !description || !status || !date || !user || !priority) {
      return res.status(400).json({ error: "task details needed" });
    }

    const employee = await User.findById(user).exec();

    if (!employee) {
      return res.status(400).json({ error: "employee doesnt exists" });
    }

    const allowedStatuses = ["incomplete", "in progress", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "wrong status value" });
    }

    if (!user) {
      return res
        .status(400)
        .json({ error: "user associated to the task is needed" });
    }
    let imagePath;

    if (req.file) {
      imagePath = `${req.protocol}://${req.get("host")}/public/uploads/${
        req.file.filename
      }`;
    } else {
      imagePath = "";
    }

    let task = new Task({
      title,
      description,
      image: imagePath,
      status,
      date,
      user,
      priority,
    });
    task = await task.save();
    if (!task) {
      return res
        .status(500)
        .json({ error: "creating task failed. please try later" });
    }
    return res.status(200).json({ task });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "creating task failed. please try later", error });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, status, date, user, priority } = req.body;
    const allowedStatuses = ["incomplete", "in progress", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "wrong status value" });
    }
    const taskId = req.params.id;
    if (!taskId) {
      return res.status(500).json({ error: "task id is needed" });
    }

    const existTask = await Task.findById(taskId).exec();
    if (!existTask) {
      res.status(500).json("updating Task failed");
    }
    let image;
    if (req.file) {
      const imagePath = `${req.protocol}://${req.get("host")}/public/uploads/${
        req.file.filename
      }`;
      image = imagePath;
    } else {
      image = existTask.image;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        description,
        image,
        status,
        date,
        user,
        priority,
      },
      { new: true }
    );

    if (!updatedTask) {
      return res
        .status(500)
        .json({ error: "updating task failed. please try later" });
    }

    return res.status(200).json({ updatedTask });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "creating task failed. please try later", error });
  }
};

exports.delete = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!taskId) {
      return res.status(500).json({ error: "task id is needed" });
    }

    const deletedTask = await Task.findByIdAndDelete(taskId).exec();

    if (!deletedTask) {
      return res
        .status(400)
        .json({ error: "task deletion failed. please try later" });
    }

    return res.status(200).json({ message: "task deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "creating task failed. please try later", error });
  }
};
// find all tasks bsed on user

exports.allTasksByUser = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ error: "fetching all tasks failed. please try later" });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "task id is not valid" });
    }

    const tasks = await Task.find({ user: id }).exec();

    if (!tasks) {
      return res
        .status(500)
        .json({ error: "fetching all tasks failed. please try later" });
    }

    if (tasks.length <= 0) {
      return res.status(200).json({ message: "no task found" });
    }

    return res.status(200).json(tasks);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "fetching all tasks failed. please try later", error });
  }
};
