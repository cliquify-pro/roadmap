// modules
const { nanoid } = require("nanoid");
const { v4: uuidv4 } = require("uuid");
const database = require("../../database");
const { validUUID } = require("../../helpers");
const logger = require("../../utils/logger");
const multer = require("multer");
const path = require("path");
const error = require("../../errorResponse.json");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

exports.create = async (req, res) => {
  const userId = req.user.userId;
  const permissions = req.user.permissions;

  const title = req.body.title;
  const contentMarkdown = req.body.contentMarkdown || null;
  const boardId = req.body.boardId ? validUUID(req.body.boardId) : null;
  const roadmapId = req.body.roadmapId ? validUUID(req.body.roadmapId) : null;
  const date = req.body.date || null;
  const release_date = req.body.release_date || null;
  const isPublic = req.body.public || "Yes";
  const media_url = req.body.media_url || null;

  // Permission check
  if (!permissions.includes("post:create")) {
    return res.status(403).send({
      message: error.api.roles.notEnoughPermission,
      code: "NOT_ENOUGH_PERMISSION",
    });
  }

  // Minimum requirement: Title must be present
  if (!title) {
    return res.status(400).send({
      message: error.api.posts.titleMissing,
      code: "POST_TITLE_MISSING",
    });
  }

  // generate slug
  const slugId = nanoid(20);
  const slug = `${title
    .replace(/[^\w\s]/gi, "")
    .replace(/\s\s+/gi, " ")
    .toLowerCase()
    .split(" ")
    .join("-")}-${slugId}`;

  try {
    const createPost = await database
      .insert({
        postId: uuidv4(),
        title,
        slug,
        slugId,
        contentMarkdown,
        userId,
        boardId, // optional
        roadmap_id: roadmapId, // optional
        date, // optional
        release_date, // optional
        public: isPublic,
        media_url, // optional
      })
      .into("posts")
      .returning("*");

    const post = createPost[0];

    // auto add vote for creator
    await database
      .insert({
        voteId: uuidv4(),
        userId,
        postId: post.postId,
      })
      .into("votes");

    res.status(201).send({ post });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Error creating post: ${err.message}, Stack: ${err.stack}`,
    });

    res.status(500).send({
      message: error.general.serverError,
      code: "SERVER_ERROR",
    });
  }
};
