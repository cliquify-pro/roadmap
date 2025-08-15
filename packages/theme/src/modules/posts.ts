// packages
import axios from "axios";

import { VITE_API_URL } from "../constants";
import type { ApiPaginationType, ApiSortType } from "../types";

// store
import { useUserStore } from "../store/user";

export interface PostType {
  postId: string;
  title: string;
  slug: string;
  slugId: string;
  contentMarkdown?: string;
  createdAt: string;
  updatedAt: string;
  date: string;
  release_date: string | null;
  public: "Yes" | "No";
  media_url?: string;
}

interface GetPostArgs extends ApiPaginationType {
  boardId?: string[];
  roadmapId?: string;
  date?: string;
  release_date?: string;
  public?: "Yes" | "No";
  media_url?: string;
}

interface CreatePostArgs {
  title: string;
  contentMarkdown?: string;
  roadmapId?: string;
  date: string;
  release_date?: string;
  public: "Yes" | "No";
  media_url?: string;
}

export interface UpdatePostArgs extends CreatePostArgs {
  id: string;
  slugId: string;
  userId: string;
  boardId?: string | null; // Allow null for non-owners
  roadmapId?: string;
}

interface PostActivityArgs {
  post_id: string;
  sort: ApiSortType;
}

interface AddCommentArgs {
  post_id: string;
  body: string;
  is_internal?: boolean;
}

// Default board ID for fallback (replace with actual ID from your backend)
const DEFAULT_BOARD_ID = "general-board-id"; // TODO: Replace with actual default board ID

/**
 * Create post
 *
 * @param {boardId} string | null board UUID (optional)
 * @param {post} object post title and description
 *
 * @returns {object} response
 */
export const createPost = async (
  boardId: string | null,
  post: CreatePostArgs,
) => {
  const { getUserId, authToken } = useUserStore();
  const finalBoardId = boardId || null;
  return await axios({
    method: "POST",
    url: `${VITE_API_URL}/api/v1/posts`,
    data: {
      title: post.title,
      contentMarkdown: post.contentMarkdown,
      userId: getUserId,
      boardId: finalBoardId,
      roadmapId: post.roadmapId,
      date: post.date,
      release_date: post.release_date,
      public: post.public || "Yes",
      media_url: post.media_url,
    },
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
};

/**
 * Get posts
 *
 * @param {number} page number default to 1
 * @param {number} limit number of posts to fetch
 * @param {string} sort createdAt sort type ASC or DESC
 * @param {string} userId logged in user UUID
 * @param {string[]} boardId array of board UUIDs
 * @param {string} roadmapId array of roadmap UUIDs
 * @param {string} date filter by date
 * @param {string} release_date filter by release date
 * @param {string} public filter by visibility (Yes/No)
 *
 * @returns {object} response
 */
export const getPosts = async ({
  page = 1,
  limit = 10,
  sort = "DESC",
  boardId = [],
  roadmapId = "",
  date = "",
  release_date = "",
  public: visibility,
}: GetPostArgs) => {
  const { getUserId } = useUserStore();

  return await axios({
    method: "POST",
    url: `${VITE_API_URL}/api/v1/posts/get`,
    data: {
      page,
      limit,
      created: sort,
      userId: getUserId,
      boardId,
      roadmapId,
      date,
      release_date,
      public: visibility,
    },
  });
};

/**
 * Get post by slug
 *
 * @param {slug} string post slug
 *
 * @returns {object} response
 */
export const getPostBySlug = async (slug: string) => {
  const { getUserId } = useUserStore();

  return await axios({
    method: "POST",
    url: `${VITE_API_URL}/api/v1/posts/slug`,
    data: {
      slug,
      userId: getUserId,
    },
  });
};

/**
 * Update post
 *
 * @param {object} post update post data
 * @param {string} post.id post UUID
 * @param {string} post.title post title
 * @param {string} post.contentMarkdown post body in markdown format
 * @param {string} post.slugId post slug UUID
 * @param {string} post.userId post author UUID
 * @param {string | null} post.boardId post board UUID (optional)
 * @param {string} post.roadmapId post roadmap UUID
 * @param {string} post.date post date
 * @param {string} post.release_date post release date
 * @param {string} post.public post visibility
 *
 * @returns {object} response
 */
export const updatePost = async (post: UpdatePostArgs) => {
  const { authToken } = useUserStore();
  const finalBoardId = post.boardId || null; // Allow null for non-owners
  return await axios({
    method: "PATCH",
    url: `${VITE_API_URL}/api/v1/posts`,
    data: {
      ...post,
      boardId: finalBoardId,
      public: post.public || "Yes",
    },
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
};

/**
 * Get post activity
 *
 * @param {object} activity
 * @param {string} activity.post_id post UUID
 * @param {string} activity.sort sort type
 */
export const postActivity = async ({ post_id, sort }: PostActivityArgs) => {
  return await axios({
    method: "GET",
    url: `${VITE_API_URL}/api/v1/posts/${post_id}/activity`,
    params: {
      sort,
    },
  });
};

/**
 * Add comment to a post
 *
 * @param {object} comment
 * @param {string} comment.body
 * @param {boolean} comment.is_internal
 */
export const addComment = async ({
  post_id,
  body,
  is_internal = false,
}: AddCommentArgs) => {
  const { authToken } = useUserStore();

  return await axios({
    method: "POST",
    url: `${VITE_API_URL}/api/v1/posts/${post_id}/comments`,
    data: {
      body,
      is_internal,
    },
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
};
