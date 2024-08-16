module.exports = (req, res, next) => {
  if (
    req.userRole == "employer" ||
    req.userRole == "admin" ||
    req.userRole == "owner"
  ) {
    return next();
  } else {
    return res.status(401).json({ error: "not Authorized" });
  }
};
