const jwt = require("jsonwebtoken");
const logchimpConfig = require("../../utils/logchimpConfig");
const config = logchimpConfig();

const me = async (req, res) => {
  try {
    // Issue a native LogChimp JWT so the frontend can use it as a Bearer
    // token for all existing API calls (comments, votes, etc.)
    const secretKey =
      process.env.LOGCHIMP_SECRET_KEY || config.server.secretKey;
    const authToken = jwt.sign({ userId: req.user.userId }, secretKey, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      authToken,
      user: {
        userId: req.user.userId,
        name: req.user.name || null,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar || null,
        isOwner: req.user.isOwner,
      },
    });
  } catch (err) {
    return res.status(500).json({
      errors: [{ type: "SERVER_ERROR", message: "Server error" }],
    });
  }
};

module.exports = me;
