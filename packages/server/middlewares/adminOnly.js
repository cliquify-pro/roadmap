const database = require("../database");

const adminOnly = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        errors: [{ type: "EMAIL_MISSING", message: "Email required" }],
      });
    }

    const user = await database("users").where({ email }).first();

    if (!user) {
      return res.status(404).json({
        errors: [{ type: "USER_NOT_FOUND", message: "User not found" }],
      });
    }

    if (!user.isOwner) {
      return res.status(403).json({
        errors: [{ type: "NOT_ADMIN", message: "Access denied" }],
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      errors: [{ type: "SERVER_ERROR", message: "Server error" }],
    });
  }
};

module.exports = adminOnly;
