const jwt = require("jsonwebtoken");
const { unsealData } = require("iron-session");
const database = require("../database");
const error = require("../errorResponse.json");

// utils
const logger = require("../utils/logger");
const logchimpConfig = require("../utils/logchimpConfig");
const config = logchimpConfig();

const extractTokenFromHeader = (header) => {
  const [scheme, token] = header.split(" ");

  if (/^Bearer$/i.test(scheme)) {
    return token;
  }
};

const computePermissions = async (user) => {
  // return all permission for owner
  if (user.isOwner) {
    const perms = await database
      .select(
        database.raw(
          "COALESCE( ARRAY_AGG(CONCAT(p.type, ':', p.action)), '{}') AS permissions",
        ),
      )
      .from("permissions AS p")
      .first();

    return perms.permissions;
  }

  // get permissions for roles
  const roles = user.roles;
  const perms = await database
    .select(
      database.raw(
        "COALESCE( ARRAY_AGG( DISTINCT( CONCAT( p.type, ':', p.action))), '{}') AS permissions",
      ),
    )
    .from("roles")
    .innerJoin("permissions_roles", "roles.id", "permissions_roles.role_id")
    .innerJoin("permissions AS p", "permissions_roles.permission_id", "p.id")
    .whereIn("roles.id", roles)
    .first();

  return perms.permissions;
};

const authenticateWithToken = async (req, res, next, token) => {
  const decoded = jwt.decode(token, { complete: true });

  // validate JWT token type
  if (!decoded?.header) {
    return res.status(401).send({
      message: error.middleware.auth.invalidToken,
      code: "INVALID_JWT",
    });
  }

  const userId = decoded.payload.userId;

  try {
    const user = await database
      .select(
        "u.userId",
        "u.name",
        "u.username",
        "u.email",
        "u.isOwner",
        "u.isBlocked",
        database.raw("ARRAY_AGG(r.id) AS roles"),
      )
      .from("users AS u")
      .leftJoin("roles_users AS ru", "u.userId", "ru.user_id")
      .leftJoin("roles AS r", "ru.role_id", "r.id")
      .groupBy("u.userId")
      .where({
        userId,
      })
      .first();

    if (!user) {
      return res.status(404).send({
        message: error.middleware.user.userNotFound,
        code: "USER_NOT_FOUND",
      });
    }

    const permissions = await computePermissions(user);

    if (user) {
      try {
        // validate JWT auth token
        const secretKey =
          process.env.LOGCHIMP_SECRET_KEY || config.server.secretKey;
        jwt.verify(token, secretKey);

        req.user = {
          ...user,
          permissions,
        };
        next();
      } catch (err) {
        if (
          err.name === "TokenExpiredError" ||
          err.name === "JsonWebTokenError"
        ) {
          return res.status(401).send({
            message: error.middleware.auth.invalidToken,
            code: "INVALID_TOKEN",
            err,
          });
        } else {
          res.status(500).send({
            message: error.general.serverError,
            code: "SERVER_ERROR",
          });
        }
      }
    } else {
      // user not found
      return res.status(404).send({
        message: error.middleware.user.userNotFound,
        code: "USER_NOT_FOUND",
      });
    }
  } catch (err) {
    logger.error(err);

    res.status(500).send({
      message: error.general.serverError,
      code: "SERVER_ERROR",
    });
  }
};

const token = async (req, res, next) => {
  // ── Admin cookie takes priority (explicit admin login) ────────────────
  const sealedAdminCookie = req.cookies && req.cookies["roadmap_admin_cookie"];
  if (sealedAdminCookie) {
    try {
      const adminSession = await unsealData(sealedAdminCookie, {
        password: process.env.IRON_SESSION_SECRET,
      });

      const { userId } = adminSession;
      if (userId) {
        const adminUser = await database
          .select(
            "u.userId",
            "u.name",
            "u.username",
            "u.email",
            "u.avatar",
            "u.isOwner",
            "u.isBlocked",
            database.raw("ARRAY_AGG(r.id) AS roles"),
          )
          .from("users AS u")
          .leftJoin("roles_users AS ru", "u.userId", "ru.user_id")
          .leftJoin("roles AS r", "ru.role_id", "r.id")
          .groupBy("u.userId")
          .where({ "u.userId": userId })
          .first();

        if (adminUser && adminUser.isOwner) {
          const permissions = await computePermissions(adminUser);
          req.user = { ...adminUser, permissions };
          return next();
        }
      }
    } catch (err) {
      // Invalid or expired — fall through to user_cookie
    }
  }

  // ── Cliquify SSO cookie (user_cookie) ─────────────────────────────────
  const sealedCookie = req.cookies && req.cookies["user_cookie"];

  if (sealedCookie) {
    try {
      // Step 1: Unseal iron-session cookie
      let session;
      try {
        session = await unsealData(sealedCookie, {
          password: process.env.IRON_SESSION_SECRET,
        });
      } catch (unsealErr) {
        return res.status(401).json({
          errors: [
            { type: "INVALID_SESSION", message: "Session invalid or expired" },
          ],
        });
      }

      // Step 2: Check isLoggedIn flag and token presence
      const sessionUser = session?.user;
      if (!sessionUser || !sessionUser.isLoggedIn || !sessionUser.token) {
        return res.status(401).json({
          errors: [{ type: "NOT_LOGGED_IN", message: "Not logged in" }],
        });
      }

      // Step 3: Verify the JWT inside the session
      let decoded;
      try {
        decoded = jwt.verify(
          sessionUser.token,
          process.env.CLIQUIFY_JWT_SECRET,
        );
      } catch (jwtErr) {
        return res.status(401).json({
          errors: [
            { type: "INVALID_SESSION", message: "Session invalid or expired" },
          ],
        });
      }

      const externalUserId = String(decoded.sub);

      // Step 4: Look up user by external_user_id
      const linkedUser = await database("users")
        .where({ external_user_id: externalUserId })
        .first();

      if (!linkedUser) {
        return res.status(401).json({
          errors: [
            {
              type: "USER_NOT_LINKED",
              message: "User not linked to Roadmap",
            },
          ],
        });
      }

      // Step 5: Fetch user with roles
      const userWithRoles = await database
        .select(
          "u.userId",
          "u.name",
          "u.username",
          "u.email",
          "u.avatar",
          "u.isOwner",
          "u.isBlocked",
          database.raw("ARRAY_AGG(r.id) AS roles"),
        )
        .from("users AS u")
        .leftJoin("roles_users AS ru", "u.userId", "ru.user_id")
        .leftJoin("roles AS r", "ru.role_id", "r.id")
        .groupBy("u.userId")
        .where({ "u.userId": linkedUser.userId })
        .first();

      // Step 6: Compute permissions
      const permissions = await computePermissions(userWithRoles);

      req.user = { ...userWithRoles, permissions };
      return next();
    } catch (err) {
      return res.status(401).json({
        errors: [
          {
            type: "INVALID_SESSION",
            message: "Session invalid or expired",
          },
        ],
      });
    }
  }

  // ── Bearer token fallback ──────────────────────────────────────────────

  // check for authorization header
  if (!req.headers?.authorization) {
    return res.status(400).send({
      message: error.middleware.auth.invalidAuthHeader,
      code: "INVALID_AUTH_HEADER",
    });
  }

  // extract token from authorization header
  const bearerToken = extractTokenFromHeader(req.headers.authorization);

  if (!bearerToken) {
    return res.status(401).send({
      message: error.middleware.auth.invalidAuthHeaderFormat,
      code: "INVALID_AUTH_HEADER_FORMAT",
    });
  }

  authenticateWithToken(req, res, next, bearerToken);
};

module.exports = token;
