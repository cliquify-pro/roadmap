const database = require("../../database");
const { sealData } = require("iron-session");
const jwt = require("jsonwebtoken");
const { validatePassword } = require("../../utils/password");
const logger = require("../../utils/logger");
const error = require("../../errorResponse.json");
const logchimpConfig = require("../../utils/logchimpConfig");
const config = logchimpConfig();

exports.login = async (req, res) => {
  const user = req.user;
  const password = req.body.password;

  if (user.isBlocked) {
    return res.status(403).send({
      message: error.middleware.user.userBlocked,
      code: "USER_BLOCKED",
    });
  }

  if (!password) {
    return res.status(400).send({
      message: error.api.authentication.noPasswordProvided,
      code: "PASSWORD_MISSING",
    });
  }

  try {
    const validateUserPassword = await validatePassword(
      password,
      user.password,
    );
    if (!validateUserPassword) {
      return res.status(403).send({
        message: error.middleware.user.incorrectPassword,
        code: "INCORRECT_PASSWORD",
      });
    }

    // Seal admin session into a signed cookie — no JWT in localStorage needed
    const sealed = await sealData(
      { userId: user.userId },
      { password: process.env.IRON_SESSION_SECRET },
    );

    res.cookie("roadmap_admin_cookie", sealed, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure: true — enable this in production (HTTPS)
    });

    const secretKey =
      process.env.LOGCHIMP_SECRET_KEY || config.server.secretKey;
    const authToken = jwt.sign({ userId: user.userId }, secretKey, {
      expiresIn: "7d",
    });

    return res.status(200).send({
      authToken,
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOwner: user.isOwner ?? false,
      },
    });
  } catch (err) {
    logger.log({
      level: "error",
      message: err,
    });

    res.status(500).send({
      message: error.general.serverError,
      code: "SERVER_ERROR",
    });
  }
};
