const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { validUUID } = require("../helpers");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const postId = req.params.postId;
    const uploadPath = path.join(
      __dirname,
      "../../content/images/post",
      postId,
    );
    fs.mkdirSync(uploadPath, { recursive: true }); // ensure folder exists
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, "media" + ext); // name as media.jpg or media.png
  },
});

const upload = multer({ storage: storage });

router.post("/upload/:postId", upload.single("file"), (req, res) => {
  const postId = req.params.postId;
  const file = req.file;

  if (!file) {
    return res.status(400).send({ success: false, error: "No file uploaded" });
  }

  const fileUrl = `/content/images/post/${postId}/${file.filename}`;
  return res.send({ success: true, url: fileUrl });
});

module.exports = router;
