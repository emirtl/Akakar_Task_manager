module.exports = (req, res, next) => {
  if (req.userRole.includes("owner")) {
    return next();
  } else {
    return res.status(401).json({ error: "not Authorized" });
  }
};
