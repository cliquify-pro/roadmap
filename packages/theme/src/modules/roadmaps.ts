// packages
import axios from "axios";

import { VITE_API_URL } from "../constants";

// store
import { useUserStore } from "../store/user";

export interface Roadmap {
  id: string;
  name: string;
  url: string;
  color: string;
}

/**
 * Get all roadmaps
 *
 * @param {string} view - The view type ('roadmap' or 'quarterly')
 * @param {number} year - The year for quarterly view (optional)
 * @returns {object} response
 */
export const getAllRoadmaps = async (view = "roadmap", year = null) => {
  const params = { view };
  if (year) params.year = year;

  return await axios({
    method: "GET",
    url: `${VITE_API_URL}/api/v1/roadmaps`,
    params,
  });
};

/**
 * Get board by URL
 *
 * @param {string} url - Board URL
 * @returns {object} response
 */
export const getRoadmapByUrl = async (url: string) => {
  return await axios({
    method: "GET",
    url: `${VITE_API_URL}/api/v1/roadmaps/${url}`,
  });
};

/**
 * Search roadmap by name
 *
 * @param {string} name - Roadmap name
 * @returns {object} response
 */
export const searchRoadmap = async (name: string) => {
  const { authToken } = useUserStore();

  return await axios({
    method: "GET",
    url: `${VITE_API_URL}/api/v1/roadmaps/search/${name}`,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
};
