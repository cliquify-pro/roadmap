// modules
const express = require("express");
const router = express.Router();

// controller
const auth = require("../../controllers/auth");
const me = require("../../controllers/auth/me");
const logout = require("../../controllers/auth/logout");

// middleware
const exists = require("../../middlewares/userExists");
const mailConfigExists = require("../../middlewares/mailConfigExists");
const validateEmailToken = require("../../middlewares/validateEmailToken");
const authenticate = require("../../middlewares/authenticate");
const adminOnly = require("../../middlewares/adminOnly");

// Cliquify SSO — returns current user from cookie
router.get("/auth/me", authenticate, me);

// Logout — clears all auth cookies
router.post("/auth/logout", logout);

// Admin-only direct login (isOwner = true required)
router.post("/auth/login", adminOnly, exists, auth.login);

// router.post("/auth/signup", mailConfigExists, auth.signup);

router.post("/auth/setup", mailConfigExists, auth.setup);
router.get("/auth/setup", auth.isSiteSetup);

// email
router.post("/auth/email/verify", mailConfigExists, exists, auth.email.verify);
router.post(
  "/auth/email/validate",
  validateEmailToken,
  exists,
  auth.email.validate,
);

// password
router.post(
  "/auth/password/reset",
  mailConfigExists,
  exists,
  auth.password.reset,
);
router.post(
  "/auth/password/validateToken",
  validateEmailToken,
  exists,
  auth.password.validateToken,
);
router.post(
  "/auth/password/set",
  validateEmailToken,
  exists,
  auth.password.set,
);

module.exports = router;
