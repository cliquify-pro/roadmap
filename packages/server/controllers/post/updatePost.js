const database = require("../../database");
const { validUUID } = require("../../helpers");
const logger = require("../../utils/logger");
const error = require("../../errorResponse.json");

exports.updatePost = async (req, res) => {
  const userId = req.user.userId;
  const permissions = req.user.permissions;
  const isOwner = req.user.isOwner; // Added to check owner status
  const postId = validUUID(req.params.postId);

  // Permissions check
  const post = await database("posts").where({ postId }).first();

  if (!post) {
    return res.status(404).send({
      message: "Post not found",
      code: "POST_NOT_FOUND",
    });
  }

  const authorId = post.userId;
  const slugId = post.slugId;
  const checkPermission = permissions.includes("post:update");
  if (!checkPermission && userId !== authorId) {
    return res.status(403).send({
      message: error.api.roles.notEnoughPermission,
      code: "NOT_ENOUGH_PERMISSION",
    });
  }

  const {
    title,
    contentMarkdown,
    boardId,
    roadmapId,
    date,
    release_date,
    media_url,
  } = req.body;
  const isPublic = req.body.public || "Yes";

  // Validate required fields
  const errors = [];
  if (!title) {
    errors.push({
      message: error.api.posts.titleMissing,
      code: "POST_TITLE_MISSING",
    });
  }
  if (isOwner && !boardId) {
    // Only require boardId for owners
    errors.push({
      message: error.api.boards.boardIdMissing,
      code: "BOARD_ID_MISSING",
    });
  }
  if (!date) {
    errors.push({
      message: "Date is required",
      code: "DATE_MISSING",
    });
  }

  if (errors.length > 0) {
    return res.status(400).send({ errors });
  }

  // Generate slug again (same as create)
  const slug = `${title
    .replace(/[^\w\s]/gi, "")
    .replace(/\s\s+/gi, " ")
    .toLowerCase()
    .split(" ")
    .join("-")}-${slugId}`;

  const updateData = {
    title,
    slug,
    contentMarkdown,
    boardId: boardId ? validUUID(boardId) : null, // Allow null for non-owners
    roadmap_id: roadmapId ? validUUID(roadmapId) : null,
    date,
    release_date,
    public: isPublic,
    media_url,
    updatedAt: new Date().toJSON(),
  };

  try {
    const updated = await database("posts")
      .where({ postId })
      .update(updateData)
      .returning("*");

    res.status(200).send({ post: updated[0] });
  } catch (err) {
    logger.error({
      code: "UPDATE_POST_FAILED",
      message: err.message,
    });
    res.status(500).send({
      message: error.general.serverError,
      code: "SERVER_ERROR",
    });
  }
};
