const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization Failed" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization Failed" });
  }

  let decoadedToken;

  try {
    decoadedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoadedToken) {
      return res.status(401).json({ error: "Authorization Failed" });
    }
    req.userId = decoadedToken.userId;
    req.userEmail = decoadedToken.email;
    req.userRole = decoadedToken.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authorization Failed", err });
  }
};
