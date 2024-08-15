module.exports = (req, res, next) => {
  if (!req.userRole.includes("majorOwner")) {
    return res.status(401).json({ error: "not Authorized" });
  }

  return next();
};
