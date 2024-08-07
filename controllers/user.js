const User = require("../models/user");
const Task = require("../models/task");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const crypto = require("crypto");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

//employer
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(401).json({ error: "validation failed, Unauthorized" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() }); // Return 422 Unprocessable Entity with error details
    }

    const existedUser = await User.findOne({ email }).exec();
    if (existedUser) {
      return res.status(403).json({
        error:
          "user with this credentials already exists. please change your email or password",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return res.status(403).json({
        error: "something went wrong. please try later",
      });
    }

    let user = new User({
      username,
      email,
      password: hashedPassword,
      role: ["employer"],
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.EMAIL_ACTIVATION_TOKEN,
      { algorithm: "HS256" }
    );

    user.token = token;
    user = await user.save();

    if (!user) {
      return res
        .status(500)
        .json({ error: "registration failed. please try later" });
    }

    const mailOptions = {
      from: {
        name: "Akakar Task Manager",
        address: process.env.EMAIL_USER,
      },
      to: user.email,
      subject: "Email Verification",
      text: `your account has been created. please click the link below to activates your account
              <a href="https://akakar-task-app-ccaef9101887.herokuapp.com/api/v1/users/verifiedAccount/${token}">Activate</a>
           
      `,
    };
    await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: err });
      }
      if (info) {
        return res.status(201).json({ user });
      }
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "registration failed. please try later", error });
  }
};

exports.verifiedAccount = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res
      .status(500)
      .json({ error: "verification failed. please try later" });
  }
  const decodedToken = jwt.verify(token, process.env.EMAIL_ACTIVATION_TOKEN);
  const id = decodedToken.userId;
  const registeredUser = await User.findById(id).exec();
  if (!registeredUser.token) {
    return res
      .status(401)
      .json(
        "no token found. please submit first to recieve a token or you already verified your account"
      );
  }
  if (!registeredUser) {
    return res
      .status(500)
      .json({ error: "no user found. please register first" });
  }

  if (!decodedToken["userId"]) {
    return res
      .status(500)
      .json({ error: "verification failed. please try later" });
  }

  await User.findByIdAndUpdate(id, { isEmaiLVerified: true });
  registeredUser.token = "";
  await registeredUser.save();
  return res.status(200).json({ message: "Email hsas been verified" });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ error: "validation failed, Unauthorized" });
    }

    const existedUser = await User.findOne({ email }).exec();

    if (!existedUser) {
      return res.status(401).json({
        error: "user with these creadentials doesn't exist. Unauthorized",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existedUser.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "user with these creadentials doesn't exist. Unauthorized",
      });
    }

    if (existedUser.isEmaiLVerified == false) {
      return res
        .status(401)
        .json({ error: "Email verification failed, Unauthorized" });
    }

    const payload = {
      userId: existedUser._id,
      username: existedUser.username,
      email: existedUser.email,
      role: existedUser.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 18000,
    });

    if (!token) {
      return res.status(401).json({ error: "login failed, Unauthorized" });
    }
    const user = { ...payload, token };
    return res.status(200).json({ user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "login failed. please try later", error });
  }
};

exports.inviteEmployee = async (req, res) => {
  const email = req.body.email;
  const id = req.params.id;
  const existedUser = await User.findOne({ email }).exec();
  if (existedUser) {
    return res.status(401).json({ error: "employee already exists" });
  }
  if (!email) {
    return res
      .status(400)
      .json({ error: "Email is needed in order to invite an employee" });
  }
  if (!id) {
    return res.status(400).json({
      error: "employer either has not been signed up or deleted his account",
    });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(401).json({ error: "id is not valid" });
  }

  const user = await User.findOne({ _id: id }).exec();
  if (!user) {
    return res.status(401).json({ error: "no employer exists" });
  }
  if (!user.role.includes("employer")) {
    return res.status(401).json({ error: "you are not an employer" });
  }

  const shortenedUsername = email.split("@")[0];
  const buf = crypto.randomBytes(8);
  const createdPass = buf.toString("hex");
  const employer = await User.findById(id).exec();
  const employeePayload = {
    employerId: id,
    username: shortenedUsername,
    email,
    password: createdPass,
  };
  const token = jwt.sign(
    employeePayload,
    process.env.EMPLOYEE_REGISTRATION_TOKEN,
    {
      algorithm: "HS256",
    }
  );
  employer.token = token;
  await employer.save();

  const mailOptions = {
    from: {
      name: `Invite letter`,
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: `Invite letter from ${user.username}`,
    text: `you have been invited by ${user.username} to the Akakar Task Manager
      
           NOTE: buy clicking the link below you will be submited
           to our website . you can change your username and password once you login and going to your account
      
            https://akakar-task-app-ccaef9101887.herokuapp.com/api/v1/users/employeeRegistration/${token}

           username : ${shortenedUsername}
           password : ${createdPass}`,
  };

  await transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: err });
    }
    if (info) {
      return res.status(201).json({ message: "email sent" });
    }
  });
};

exports.employeeRegistration = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) {
      return res
        .status(400)
        .json({ error: "something went wrong. please try later", error });
    }
    const decodedToken = jwt.verify(
      token,
      process.env.EMPLOYEE_REGISTRATION_TOKEN
    );

    if (!decodedToken) {
      return res
        .status(400)
        .json({ error: "something went wrong. please try later" });
    }

    const employer = await User.findById(decodedToken.employerId).exec();
    if (!employer.token) {
      return res
        .status(400)
        .json({ error: "no token found .employee already regitered" });
    }

    const hashedPass = bcrypt.hashSync(decodedToken.password, 10);
    if (!hashedPass) {
      return res
        .status(500)
        .json({ error: "something went wrong. please try later" });
    }
    let user = new User({
      username: decodedToken.username,
      email: decodedToken.email,
      password: hashedPass,
      role: "employee",
      isEmaiLVerified: true,
    });
    user = await user.save();

    if (employer.role.includes("employer")) {
      employer.referals.push(user._id);
      await employer.save();
    }

    if (!user) {
      return res
        .status(500)
        .json({ error: "something went wrong. please try later" });
    }
    employer.token = "";
    await employer.save();
    return res.status(201).json({ message: "employee has been registered" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "something went wrong. please try later", error });
  }
};

exports.user = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(401).json({ error: "id is not valid" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res
        .status(500)
        .json({ error: "loading users failed, please try later" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "loading users failed. please try later", error });
  }
};

exports.users = async (req, res) => {
  try {
    const users = await User.find({}).exec();
    if (!users) {
      return res
        .status(500)
        .json({ error: "loading users failed, please try later" });
    }
    return res.status(200).json({ users });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "loading users failed. please try later", error });
  }
};
// ----admin ----
// delete user by admin

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "user id is needed" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "user id is not valid" });
    }
    const deletedUser = await User.findByIdAndDelete(id).exec();
    if (!deletedUser) {
      return res
        .status(500)
        .json({ error: "user deletion failed. please try later" });
    }

    if (deletedUser.role.includes("employee")) {
      await User.updateMany(
        { referals: { $in: [deletedUser._id] } },
        { $pull: { referals: deletedUser._id } }
      );
      const deletedUserTasks = await Task.find({
        user: deletedUser._id,
      }).exec();
      deletedUserTasks.map(async (task) => {
        await Task.findByIdAndDelete(task._id);
      });
    }
    return res.status(200).json({ message: "user deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "loading users failed. please try later", error });
  }
};

// ----- owner -----
//upgradeToAdmin

exports.upgradeToAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "user id is needed" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "user id is not valid" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(400).json({ error: "user not found" });
    }

    if (user.role.includes("admin")) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    user.role.push("admin");
    await user.save();
    return res.status(200).json({ message: "user upgraded to admin level" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "upgrading to admin failed. please try later", error });
  }
};

//degradeToUSer
exports.degradeToUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "user id is needed" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "user id is not valid" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(400).json({ error: "user not found" });
    }

    if (!user.role.includes("admin") && !user.role.includes("owner")) {
      return res.status(400).json({ error: "User is not an admin" });
    }

    user.role.pull("admin");
    await user.save();
    return res.status(200).json({ message: "user is not an admin anymore" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "upgrading to admin failed. please try later", error });
  }
};

// change User password
exports.updateUserPassword = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(500)
        .json({ error: "changing password failed. please try later" });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(401).json({ error: "user id is not valid" });
    }

    const previousPassword = req.body.password;

    if (!previousPassword) {
      return res.status(400).json({ error: "previous password is needed" });
    }
    const existeduser = await User.findById(id).exec();

    const isMatch = await bcrypt.compare(
      previousPassword,
      existeduser.password
    );

    if (!isMatch) {
      return res.status(500).json({ error: "password is wrong." });
    }

    const newPassword = req.body.newPassword;

    if (!newPassword) {
      return res.status(400).json({ error: "new password is needed" });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

    if (!hashedNewPassword) {
      return res
        .status(500)
        .json({ error: "faield to change your password. please try later" });
    }

    await User.findByIdAndUpdate(id, { password: hashedNewPassword });
    return res.status(200).json({ message: "password has been changed" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "changing password failed. please try later", error });
  }
};
