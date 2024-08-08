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
    const { username, email, password, city, province, address, phone } =
      req.body;
    if (!username || !email || !password) {
      return res.status(401).json({ error: "doğrulama başarısız" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() }); // Return 422 Unprocessable Entity with error details
    }

    const existedUser = await User.findOne({ email }).exec();
    if (existedUser) {
      return res.status(403).json({
        error:
          "Bu kullanıcı bilgilerine sahip kullanıcı zaten var. lütfen e-postanızı veya şifrenizi değiştirin",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return res.status(403).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
    }

    let user = new User({
      username,
      email,
      password: hashedPassword,
      city,
      province,
      address,
      phone,
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
        .json({ error: "kayıt başarısız. lütfen daha sonra tekrar deneyin" });
    }

    const mailOptions = {
      from: {
        name: "Akakar Task Manager",
        address: process.env.EMAIL_USER,
      },
      to: user.email,
      subject: "Email Verification",
      text: `Hesabınız oluşturuldu. Hesabınızı etkinleştirmek için lütfen aşağıdaki bağlantıya tıklayın
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
    return res.status(500).json({
      error: "kayıt başarısız. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

exports.verifiedAccount = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(500).json({
      error: "doğrulama başarısız oldu. lütfen daha sonra tekrar deneyin",
    });
  }
  // doğrulama başarısız oldu. lütfen daha sonra tekrar deneyin
  const decodedToken = jwt.verify(token, process.env.EMAIL_ACTIVATION_TOKEN);
  const id = decodedToken.userId;
  const registeredUser = await User.findById(id).exec();
  if (!registeredUser.token) {
    return res
      .status(401)
      .json("Önce kayıt olun veya hesabınızı zaten doğruladınız");
  }
  if (!registeredUser) {
    return res
      .status(500)
      .json({ error: "Kullanıcı bulunamadı. lütfen önce kayıt olun" });
  }

  if (!decodedToken["userId"]) {
    return res.status(500).json({
      error: "doğrulama başarısız oldu. lütfen daha sonra tekrar deneyin",
    });
  }

  await User.findByIdAndUpdate(id, { isEmaiLVerified: true });
  registeredUser.token = "";
  await registeredUser.save();
  return res.status(200).json({ message: "E-posta doğrulandı" });
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ error: "doğrulama başarısız oldu" });
    }

    const existedUser = await User.findOne({ email }).exec();

    if (!existedUser) {
      return res.status(401).json({
        error: "bu kimlik bilgilerine sahip kullanıcı mevcut değil",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existedUser.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "bu kimlik bilgilerine sahip kullanıcı mevcut değil",
      });
    }

    if (existedUser.isEmaiLVerified == false) {
      return res
        .status(401)
        .json({ error: "E-posta doğrulaması başarısız oldu, Yetkisiz" });
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
      return res.status(401).json({ error: "Giriş başarısız" });
    }
    const user = { ...payload, token };
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      error: "giriş başarısız oldu. lütfen daha sonra tekrar deneyin",
      error,
    });
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
      .json({ error: "Bir çalışanı davet etmek için e-posta gereklidir" });
  }
  if (!id) {
    return res.status(400).json({
      error: "işveren ya kaydolmamış ya da hesabını silmiş",
    });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(401).json({ error: "kimlik/id geçerli değil" });
  }

  const user = await User.findOne({ _id: id }).exec();
  if (!user) {
    return res.status(401).json({ error: "bu işveren mevcut değil" });
  }
  if (!user.role.includes("employer")) {
    return res.status(401).json({ error: "sen işveren değilsin" });
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
      
           NOTE: Mi Task’a hoş geldiniz. Sizi Aşağıdaki linke tıklayarak uygulamaya giriş yapabilir ve şifrenizi belirleyebilirsiniz.
      
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
      return res.status(201).json({ message: "E-posta gönderildi" });
    }
  });
};

exports.employeeRegistration = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
        error,
      });
    }

    const decodedToken = jwt.verify(
      token,
      process.env.EMPLOYEE_REGISTRATION_TOKEN
    );

    if (!decodedToken) {
      return res.status(400).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
    }

    const employer = await User.findById(decodedToken.employerId).exec();
    if (!employer.token) {
      return res.status(400).json({ error: "çalışan zaten kayıtlı" });
    }
    // çalışan zaten kayıtlı

    const hashedPass = bcrypt.hashSync(decodedToken.password, 10);
    if (!hashedPass) {
      return res.status(500).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
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
      return res.status(500).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
    }
    employer.token = "";
    await employer.save();
    return res.status(201).json({ message: "çalışan kaydedildi" });
    // çalışan kaydedildi
  } catch (error) {
    return res.status(500).json({
      error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

exports.user = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(401).json({ error: "kimlik/id geçerli değil" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res
        .status(500)
        .json({ error: "kullanıcılar yüklenemedi, lütfen daha sonra deneyin" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      error: "kullanıcılar yüklenemedi, lütfen daha sonra deneyin",
      error,
    });
  }
};

exports.users = async (req, res) => {
  try {
    const users = await User.find({}).exec();
    if (!users) {
      return res
        .status(500)
        .json({ error: "kullanıcılar yüklenemedi, lütfen daha sonra deneyin" });
    }
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({
      error: "kullanıcılar yüklenemedi, lütfen daha sonra deneyin",
      error,
    });
  }
};
// ----admin ----
// delete user by admin

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "kullanıcı kimliği/id gerekli" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }
    const deletedUser = await User.findByIdAndDelete(id).exec();
    if (!deletedUser) {
      return res.status(500).json({
        error:
          "kullanıcı silme işlemi başarısız oldu. lütfen daha sonra tekrar deneyin",
      });
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
    return res.status(200).json({ message: "kullanıcı silindi" });
  } catch (error) {
    return res.status(500).json({
      error:
        "kullanıcının silinmesi başarısız oldu. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

// ----- owner -----
//upgradeToAdmin

exports.upgradeToAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "kullanıcı kimliği/id gerekli" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(400).json({ error: "Kullanıcı bulunamadı" });
    }

    if (user.role.includes("admin")) {
      return res.status(400).json({ error: "Kullanıcı zaten bir yönetici" });
    }

    user.role.push("admin");
    await user.save();
    return res
      .status(200)
      .json({ message: "kullanıcı yönetici düzeyine yükseltildi" });
  } catch (error) {
    return res.status(500).json({
      error:
        "yöneticiye yükseltme başarısız oldu. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

//degradeToUSer
exports.degradeToUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "kullanıcı kimliği/id gerekli" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(400).json({ error: "Kullanıcı bulunamadı" });
    }

    if (!user.role.includes("admin") && !user.role.includes("owner")) {
      return res.status(400).json({ error: "Kullanıcı yönetici değil" });
    }

    user.role.pull("admin");
    await user.save();
    return res.status(200).json({ message: "kullanıcı artık yönetici değil" });
  } catch (error) {
    return res.status(500).json({
      error:
        "yöneticiye yükseltme başarısız oldu. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

// change User password
exports.updateUserPassword = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(500).json({
        error:
          "şifre değiştirme başarısız oldu. lütfen daha sonra tekrar deneyin",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(401)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }

    const previousPassword = req.body.password;

    if (!previousPassword) {
      return res.status(400).json({ error: "önceki şifre gerekli" });
    }
    // önceki şifre gerekli
    const existeduser = await User.findById(id).exec();

    const isMatch = await bcrypt.compare(
      previousPassword,
      existeduser.password
    );

    if (!isMatch) {
      return res.status(500).json({ error: "önceki şifre yanlış" });
    }

    const newPassword = req.body.newPassword;

    if (!newPassword) {
      return res.status(400).json({ error: "yeni şifre gerekli" });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

    if (!hashedNewPassword) {
      return res.status(500).json({
        error: "şifreniz değiştirilemedi. lütfen daha sonra tekrar deneyin",
      });
    }
    await User.findByIdAndUpdate(id, { password: hashedNewPassword });
    return res.status(200).json({ message: "şifre değiştirildi" });
  } catch (error) {
    return res.status(500).json({
      error:
        "şifre değiştirme başarısız oldu. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};
