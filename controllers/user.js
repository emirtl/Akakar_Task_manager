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

//new register
exports.register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      city,
      province,
      address,
      phone,
      role,
      companyCode,
    } = req.body;

    if (!fullName || !email || !password) {
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

    // hashing password
    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return res.status(403).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
    }

    let user;

    user = new User({
      fullName,
      email,
      password: hashedPassword,
      city,
      province,
      address,
      phone,
      role: [role],
    });

    if (role == "owner") {
      const randomValueHex = (len) => {
        return crypto
          .randomBytes(Math.ceil(len / 2))
          .toString("hex") // convert to hexadecimal format
          .slice(0, len)
          .toUpperCase(); // return required number of characters
      };

      const companyCode =
        randomValueHex(4) + "-" + randomValueHex(4) + "-" + randomValueHex(4);

      user.companyCode = companyCode;
    } else {
      const owner = await User.findOne({
        role: "owner",
        companyCode,
      })
        .populate("referals", "-password")
        .exec();

      if (!owner) {
        return res.status(404).json({
          error:
            "bu şirket koduna sahip bulunamadı. lütfen şirket kodunuzu kontrol edin",
        });
      }
      7;

      user.companyCode = owner.companyCode;
      user.referals.push(owner);
      owner.referals.push(user);
      await owner.save();
    }

    //email verification

    const token = jwt.sign(
      { userId: user._id },
      process.env.EMAIL_ACTIVATION_TOKEN,
      { algorithm: "HS256" }
    );

    user.token = token;

    user = await user.save();

    const mailOptions = {
      from: {
        name: "Akakar Task Manager",
        address: process.env.EMAIL_USER,
      },
      to: user.email,
      subject: "E-posta Doğrulaması",
      text: `Hesabınız oluşturuldu. Hesabınızı etkinleştirmek için lütfen aşağıdaki bağlantıya tıklayın
          <a href="https://akakar-task-app-ccaef9101887.herokuapp.com/api/v1/users/verifiedAccount/${token}"></a>
            `,
    };

    await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: err });
      }
      if (info) {
        return res.status(200).json({ user });
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
    const { fullName, email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ error: "doğrulama başarısız oldu" });
    }

    const existedUser = await User.findOne({ email })
      .populate("referals", "-password")
      .exec();

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
        .json({ error: "lütfen önce hesabınızı doğrulayın" });
    }

    const payload = {
      referals: existedUser.referals,
      userId: existedUser._id,
      fullName: existedUser.fullName,
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

exports.getAllCompanyUsers = async (req, res) => {
  try {
    const companyCode = req.params.companyCode; // user id

    if (!companyCode) {
      return res.status(401).json({ error: "kimlik/copmpanyCode gerekli" });
    }

    const users = await User.find({ companyCode }).exec();

    if (users.length <= 0) {
      return res.status(200).json({
        message: "kullanıcı bulunamadı",
      });
    }

    if (!users) {
      return res.status(500).json({
        error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      });
    }

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({
      error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

//* get All Users in application

exports.users = async (req, res) => {
  try {
    const users = await User.find({}).populate("referals", "-password").exec();
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

//* ----admin ----
//* delete user by majorAdmin

exports.deleteUserByMajor = async (req, res) => {
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

exports.deleteCompanyMember = async (req, res) => {
  const id = req.params.id; // userId to be deleted

  if (!id) {
    return res.status(400).json({ error: "kullanıcı kimliği/id gerekli" });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json({ error: "kullanıcı kimliği/id geçerli değil" });
  }

  const companyCode = req.body.companyCode;

  if (!companyCode) {
    return res.status(400).json({
      error: "companyCode gerekli",
    });
  }

  const companyOwner = await User.findOne({
    _id: req.userId,
    companyCode,
    role: "owner",
  });
  if (!companyOwner) {
    return res.status(401).json({ error: "yetkili değilsin" });
  }

  if (companyOwner.companyCode != companyCode) {
    return res.status(401).json({ error: "yanlış şirket kodu" });
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
};

//* ----- owner -----
//* upgradeToMajorAdmin

exports.upgradeToMajorAdmin = async (req, res) => {
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

    if (user.role.includes("majorAdmin")) {
      return res.status(400).json({ error: "Kullanıcı zaten bir yönetici" });
    }

    user.role.push("majorAdmin");
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

//* degradeMajorAdminToUser
exports.degradeMajorAdminToUser = async (req, res) => {
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

    if (!user.role.includes("majorAdmin")) {
      return res.status(400).json({ error: "Kullanıcı yönetici değil" });
    }

    user.role.pull("majorAdmin");
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

//* upgrade to admin

exports.upgradeToCompanyAdmin = async (req, res) => {
  try {
    const id = req.params.id; // userId meant to be admin
    if (!id) {
      return res.status(400).json({
        error: "kimlik/id gerekli",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(401)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }

    const companyCode = req.body.companyCode;

    if (!companyCode) {
      return res.status(400).json({
        error: "companyCode gerekli",
      });
    }

    const companyOwner = await User.findOne({
      _id: req.userId,
      companyCode,
      role: "owner",
    });
    if (!companyOwner) {
      return res.status(401).json({ error: "yetkili değilsin" });
    }

    //const existedUser = await User.findById(id).exec();

    const companyMember = await User.findOne({ _id: id, companyCode }).exec();
    if (!companyMember) {
      return res.status(401).json({ error: "grup üyesi mevcut değil" });
    }

    await companyMember.role.push("admin");
    await companyMember.save();
    return res.status(200).json({ error: "üye yöneticiliğe yükseltildi" });
  } catch (error) {
    return res.status(500).json({
      error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};

exports.degradeToCompanyUser = async (req, res) => {
  try {
    const id = req.params.id; // admin userID meant to be normal user
    if (!id) {
      return res.status(400).json({
        error: "kimlik/id gerekli",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(401)
        .json({ error: "kullanıcı kimliği/id geçerli değil" });
    }

    const companyCode = req.body.companyCode;

    if (!companyCode) {
      return res.status(400).json({
        error: "companyCode gerekli",
      });
    }

    const companyOwner = await User.findOne({
      _id: req.userId,
      companyCode,
      role: "owner",
    });
    if (!companyOwner) {
      return res.status(401).json({ error: "yetkili değilsin" });
    }

    const companyAdmin = await User.findOne({ _id: id, companyCode }).exec();
    if (!companyAdmin) {
      return res.status(401).json({ error: "grup üyesi mevcut değil" });
    }
    if (!companyAdmin.role.includes("admin")) {
      return res.status(401).json({ error: "kullanıcı yönetici değil" });
    }

    await companyAdmin.role.pop("admin");
    await companyAdmin.save();
    return res.status(200).json({ error: "kullanıcı artık yönetici değil" });
  } catch (error) {
    return res.status(500).json({
      error: "bir şeyler yanlış gitti. lütfen daha sonra tekrar deneyin",
      error,
    });
  }
};
