<template>
  <div v-if="loading" class="loader-container">
    <loader />
  </div>
  <div v-else-if="post" class="viewpost">
    <div class="viewpost__vote">
      <div>
        <vote :post-id="post.postId" :votes-count="post.voters.votesCount" :is-voted="isVoted"
          @update-voters="updateVoters" />
      </div>
      <div class="viewpost__content">
        <h2 class="viewpost__title">{{ post.title }}</h2>

        <div class="viewpost__meta">
          <div class="viewpost__meta-author">
            <avatar class="viewpost__author-avatar" :src="post.author.avatar" :name="post.author.name" />
            {{ post.author.name }}
          </div>
          <div class="viewpost__meta-divider">|</div>
          <time :datetime="post.createdAt" :title="dayjs(post.createdAt).format('dddd, DD MMMM YYYY hh:mm')"
            class="viewpost__meta-date">
            {{ dayjs(post.createdAt).fromNow() }}
          </time>
          <div v-if="post.release_date" class="viewpost__meta-release">
            <div class="viewpost__meta-divider">|</div>
            <span>Release: {{ dayjs(post.release_date).format('DD MMMM YYYY') }}</span>
          </div>
          <div v-if="post.roadmap?.name" class="viewpost__meta-roadmap">
            <div class="viewpost__meta-divider">|</div>
            <span>Status: {{ post.roadmap.name }}</span>
          </div>
          <!-- <dropdown-wrapper v-if="isPostAuthor" class="viewpost__menu">
            <template #toggle>
              <div class="dropdown-menu-icon">
                <more-icon />
              </div>
            </template>
<template #default="dropdown">
              <dropdown v-if="dropdown.active" class="viewpost__menu-dropdown">
                <dropdown-item @click="editPost">
                  <template #icon>
                    <edit-icon />
                  </template>
Edit
</dropdown-item>
</dropdown>
</template>
</dropdown-wrapper> -->
        </div>
        <!-- Image Section -->
        <div v-if="post.media_url" class="viewpost__media">
          <img :src="getMediaUrl(post.media_url)" alt="Post Media" class="viewpost__media-image" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 8px; margin-top: 0.5rem; object-fit: cover;" />
        </div>
        <p v-html=" postContent" class="viewpost__description" />
        </div>
      </div>

      <div v-if="showPostActivity" class="activity-section">
        <add-comment :post-id="post.postId" />
        <!-- <header class="activity-header">
        <h6>Activity</h6>
      </header>
      <div v-if="!activity.loading" class="activity-list">
        <activity-item
          v-for="item in activity.data"
          :key="item.id"
          :activity="item"
        />
      </div>
      <div v-else class="loader-container">
        <loader />
      </div> -->
      </div>
    </div>
    <div v-else>
      <p class="viewpost__no-post">There is no such post.</p>
    </div>
</template>

<script setup lang="ts">
import { VITE_API_URL } from "../constants";
import { ref, computed, onMounted, watch } from "vue";
import { useHead } from "@vueuse/head";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MoreHorizontal as MoreIcon, Edit2 as EditIcon } from "lucide-vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../store/user"; // Adjust path to your store
import { useSettingStore } from "../store/settings"; // Adjust path to your store
import { getPostBySlug, addComment, postActivity } from "../modules/posts";

// Components
import Loader from "./ui/Loader.vue";
import Vote, { VoteEventType } from "./vote/Vote.vue"; // Adjust path
import DropdownWrapper from "../components/ui/dropdown/DropdownWrapper.vue"; // Adjust path
import Dropdown from "./ui/dropdown/Dropdown.vue"; // Adjust path
import DropdownItem from "./ui/dropdown/DropdownItem.vue"; // Adjust path
import Avatar from "./ui/Avatar/Avatar.vue"; // Adjust path
import AddComment from "./activity/AddComment.vue"; // Adjust path
import ActivityItem from "./activity/ActivityItem.vue";

dayjs.extend(relativeTime);

const props = defineProps<{
  slug: string;
}>();

const router = useRouter();
const { permissions, getUserId } = useUserStore();
const { labs, get: siteSettings } = useSettingStore();

function getMediaUrl(path) {
  const fullUrl = `${VITE_API_URL}${path}`;
  return fullUrl;
}

const post = ref<{
  postId: string;
  title: string;
  contentMarkdown: string;
  createdAt: string;
  author: { name: string; username: string; avatar: string; userId: string };
  voters: { votesCount: number; viewerVote: boolean };
  slug: string;
  media_url?: string;
  release_date?: string;
  roadmap?: { name: string };
} | null>(null);
const loading = ref(true);
const postContent = ref<string>("");
const activity = ref<{
  loading: boolean;
  sort: "ASC" | "DESC";
  data: any[];
}>({
  loading: false,
  sort: "DESC",
  data: [],
});

const postLoading = ref(false);
const isPostExist = ref(false);

const isVoted = computed(() => post.value?.voters?.viewerVote ?? false);
const isPostAuthor = computed(() => {
  const checkPermission = permissions.includes("post:update");
  const authorId = post.value?.author.userId;
  return checkPermission || (getUserId === authorId && !!authorId);
});
const showPostActivity = computed(() => labs.comments);

async function fetchPost() {
  if (!props.slug) return;
  loading.value = true;

  try {
    const response = await axios.post(`/api/v1/posts/slug`, {
      slug: props.slug,
    });
    post.value = response.data.post;
    if (post.value?.contentMarkdown) {
      postContent.value = post.value.contentMarkdown.replace(/\n/g, "<br>");
    }
    if (showPostActivity.value) {
      getPostActivity();
    }
  } catch (err) {
    console.error("Failed to fetch post", err);
    post.value = null;
  } finally {
    loading.value = false;
  }
}

async function getPostActivity(sort: "ASC" | "DESC" = "DESC") {
  if (!post.value?.postId) return;
  activity.value.loading = true;

  try {
    const response = await axios.get(
      `/api/v1/posts/${post.value.postId}/activity`,
      {
        params: { sort },
      },
    );
    activity.value.data = response.data.activity;
  } catch (err) {
    console.error("Failed to fetch activity", err);
  } finally {
    activity.value.loading = false;
  }
}

async function postBySlug() {
  postLoading.value = true;
  const route = router.currentRoute.value;

  if (route.params.slug) {
    try {
      const slug = route.params.slug.toString();
      const response = await getPostBySlug(slug);

      postLoading.value = false;
      Object.assign(post.value || {}, response.data.post);
      isPostExist.value = true;

      if (response.data.post.hasOwnProperty("contentMarkdown")) {
        postContent.value = response.data.post.contentMarkdown.replace(
          /\n/g,
          "<br>",
        );
      }

      getPostActivity();
    } catch (error: any) {
      if (error.response.data.code === "POST_NOT_FOUND") {
        postLoading.value = false;
        isPostExist.value = false;
      }
    }
  }
}

function updateVoters(voters: { votesCount: number; viewerVote: boolean }) {
  if (post.value) {
    post.value.voters.votesCount = voters.votesCount;
    post.value.voters.viewerVote = voters.viewerVote;
  }
}

function editPost() {
  if (post.value?.slug) {
    router.push(`/posts/${post.value.slug}/edit`);
  }
}

watch(
  () => props.slug,
  () => {
    fetchPost();
  },
  { immediate: true },
);

watch(
  () => activity.value.sort,
  (sort) => {
    getPostActivity(sort);
  },
);

useHead({
  title: () => `${post.value?.title ? `${post.value.title} • ` : ""}Post`,
  meta: [
    {
      name: "description",
      content: () => post.value?.contentMarkdown || "",
    },
    {
      name: "og:title",
      content: () =>
        `${post.value?.title ? `${post.value.title} • ` : ""}Post • ${siteSettings.title}`,
    },
    {
      name: "og:description",
      content: () => post.value?.contentMarkdown || "",
    },
  ],
});
</script>

<style lang="sass">
.view
  display: flex
  flex-direction: column
  max-width: 800px
  margin: 0 auto
  padding: 1rem

@media (min-width: 960px)
  .view
    flex-direction: row

.viewpost
  flex: 2

  &__vote
    display: flex
    align-items: flex-start
    gap: 1rem

  &__title
    margin-bottom: 1rem
    font-size: 1.5rem
    font-weight: 600

  &__media
    margin-bottom: 1rem

  &__media-image
    max-width: 100%
    height: auto
    border-radius: 8px
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)

  &__content
    width: 100%

  &__meta
    display: flex
    align-items: center
    flex-wrap: wrap
    gap: 0.5rem
    margin-bottom: 1.5rem
    color: #666
    font-size: 0.875rem

    &-author
      display: flex
      align-items: center

    &-divider
      margin: 0 0.5rem
      color: #BABABA

    &-release,
    &-roadmap
      display: flex
      align-items: center

    &-date
      color: #CCCCCC

  &__author-avatar
    margin-right: 0.5rem
    width: 24px
    height: 24px

  &__menu
    margin-left: auto

    &-dropdown
      right: 0

  &__description
    margin-bottom: 1.5rem
    line-height: 1.6

  &__no-post
    text-align: center
    color: #666
    padding: 2rem

@media (min-width: 960px)
  .viewpost
    margin-right: 1.5rem

.activity-section, .activity-header
  margin-top: 2rem

.activity-header
  display: flex
  align-items: center
  margin-bottom: 1.25rem
  text-transform: uppercase
  font-size: 0.875rem

  h6
    margin-bottom: 0
    font-weight: 600

.loader-container
  display: flex
  justify-content: center
  align-items: center
  padding: 2rem
</style>