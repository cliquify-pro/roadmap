const database = require("../../database");
const getVotes = require("../../services/votes/getVotes");
const { validUUID } = require("../../helpers");
const logger = require("../../utils/logger");
const error = require("../../errorResponse.json");

module.exports = async (req, res) => {
  try {
    const { view, year } = req.query;

    // Fetch roadmaps
    const roadmaps = await database
      .select("id", "name", "url", "color", "display", "index")
      .from("roadmaps")
      .orderBy("index", "asc");

    const roadmapIds = roadmaps.map((r) => r.id);

    // Fetch posts with year filter for quarterly view
    let postsQuery = database
      .select("*")
      .from("posts")
      .whereIn("roadmap_id", roadmapIds);

    if (view === "quarterly" && year) {
      postsQuery = postsQuery.whereBetween("date", [
        `${year}-01-01`,
        `${parseInt(year) + 1}-01-01`,
      ]);
    }

    const posts = await postsQuery;

    // Fetch boards
    const boardIds = [...new Set(posts.map((post) => post.boardId))];
    const boards = await database
      .select("boardId", "name", "url", "color")
      .from("boards")
      .whereIn("boardId", boardIds);

    // Fetch authors
    const userIds = [...new Set(posts.map((post) => post.userId))];
    const authors = await database
      .select("userId", "name", "username", "avatar")
      .from("users")
      .whereIn("userId", userIds);

    // Fetch all votes for posts
    const postIds = posts.map((post) => post.postId);
    const allVotes = await database
      .select("*")
      .from("votes")
      .whereIn("postId", postIds);

    // Map votes
    const votesMap = {};
    allVotes.forEach((vote) => {
      if (!votesMap[vote.postId]) votesMap[vote.postId] = [];
      votesMap[vote.postId].push(vote);
    });

    // Map boards and authors
    const boardMap = {};
    boards.forEach((board) => {
      boardMap[board.boardId] = board;
    });

    const authorMap = {};
    authors.forEach((author) => {
      authorMap[author.userId] = author;
    });

    // Get userId from query or headers
    const userId =
      validUUID(req.query.userId) || validUUID(req.headers.userId) || null;

    let result;
    if (view === "roadmap") {
      // Existing roadmap logic
      const roadmapMap = {};
      roadmaps.forEach((roadmap) => {
        roadmapMap[roadmap.id] = { ...roadmap, posts: [] };
      });

      for (const post of posts) {
        const votes = votesMap[post.postId] || [];
        const voters = {
          votesCount: votes.length,
          votes,
          viewerVote: userId
            ? votes.find((v) => v.userId === userId) || null
            : null,
        };

        const {
          boardId,
          userId: postUserId,
          roadmap_id,
          ...cleanedPost
        } = post;
        const postWithData = {
          ...cleanedPost,
          board: boardMap[boardId] || null,
          author: authorMap[postUserId] || null,
          voters,
        };

        if (roadmapMap[post.roadmap_id]) {
          roadmapMap[post.roadmap_id].posts.push(postWithData);
        }
      }

      result = Object.values(roadmapMap);
    } else if (view === "quarterly") {
      // Quarterly view: Create synthetic roadmaps for Q1-Q4
      const quarterMap = {
        Q1: { id: "Q1", name: "Q1", url: "/q1", color: "ff0000", posts: [] },
        Q2: { id: "Q2", name: "Q2", url: "/q2", color: "00ff00", posts: [] },
        Q3: { id: "Q3", name: "Q3", url: "/q3", color: "0000ff", posts: [] },
        Q4: { id: "Q4", name: "Q4", url: "/q4", color: "ffff00", posts: [] },
      };

      for (const post of posts) {
        const date = new Date(post.date);
        const month = date.getMonth() + 1;
        const quarter = `Q${Math.ceil(month / 3)}`;
        const votes = votesMap[post.postId] || [];
        const voters = {
          votesCount: votes.length,
          votes,
          viewerVote: userId
            ? votes.find((v) => v.userId === userId) || null
            : null,
        };

        const {
          boardId,
          userId: postUserId,
          roadmap_id,
          ...cleanedPost
        } = post;
        const postWithData = {
          ...cleanedPost,
          board: boardMap[boardId] || null,
          author: authorMap[postUserId] || null,
          voters,
        };

        if (quarterMap[quarter]) {
          quarterMap[quarter].posts.push(postWithData);
        }
      }

      result = Object.values(quarterMap);
    } else {
      throw new Error("Invalid view type");
    }

    res.status(200).send({ result });
  } catch (err) {
    logger.error({ message: err });
    res.status(500).send({
      message: error.general.serverError,
      code: "SERVER_ERROR",
    });
  }
};
