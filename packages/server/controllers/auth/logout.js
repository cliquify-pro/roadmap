const logout = (req, res) => {
  res.clearCookie("roadmap_admin_cookie", { path: "/" });
  res.clearCookie("user_cookie", { path: "/" });
  return res.status(200).json({ message: "Logged out" });
};

module.exports = logout;
