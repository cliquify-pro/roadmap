<template>
  <div class="roadmap-column" data-test="roadmap-column">
    <div class="roadmap-header" data-test="roadmap-header">
      <div class="roadmap-heading">
        <span class="color-dot" :style="{ backgroundColor: `#${roadmap.color}` }" />
        <h6>{{ roadmap.name }}</h6>
      </div>
    </div>

    <div class="post-list">
      <draggable v-model="localPosts" group="posts" item-key="postId" class="draggable-container" @change="onPostMoved">
        <template #item="{ element: post }">
          <roadmap-post-card :post="post" @open-drawer="handleOpenDrawer" />
        </template>
      </draggable>
    </div>

    <!-- Create new button with permission check -->
    <button v-if="!createPostPermissionDisabled" class="create-new-btn" @click="openOffcanvas">
      + Create new
    </button>

    <!-- Offcanvas for creating a post -->
    <OffcanvasCreatePost :visible="isOffcanvasOpen" :roadmapId="roadmap.id" @close="closeOffcanvas"
      @post-created="handlePostCreated" />

    <!-- Post drawer -->
    <PostDrawer :visible="drawerVisible" :slug="selectedSlug" @close="drawerVisible = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import draggable from "vuedraggable";
import RoadmapPostCard from "../../components/roadmap/RoadmapPostCard.vue";
import PostDrawer from "../../../components/PostDrawer.vue";
import OffcanvasCreatePost from "../../../components/post/OffcanvasCreatePost.vue";
import { useUserStore } from "../../../store/user";

const drawerVisible = ref(false);
const selectedSlug = ref("");
const isOffcanvasOpen = ref(false);
const { getUserId, permissions } = useUserStore(); // Destructure permissions

// Computed property to check create post permission
const createPostPermissionDisabled = computed(() => {
  return !permissions.includes("post:create");
});

function handleOpenDrawer(slug: string) {
  selectedSlug.value = slug;
  drawerVisible.value = true;
}

function openOffcanvas() {
  if (getUserId) {
    isOffcanvasOpen.value = true;
  } else {
    console.log("Please log in to create a post");
    // Optionally redirect to login
  }
}

function closeOffcanvas() {
  isOffcanvasOpen.value = false;
}

const props = defineProps<{
  roadmap: {
    id: string;
    name: string;
    color: string;
    posts: any[];
  };
}>();

const emits = defineEmits<{
  (
    e: "postMoved",
    payload: { postId: string; toRoadmapId: string; newIndex: number },
  ): void;
}>();

const localPosts = ref([...props.roadmap.posts]);

watch(
  () => props.roadmap.posts,
  (newVal) => {
    localPosts.value = [...newVal];
  },
);

function onPostMoved(event: any) {
  const element = event.moved?.element || event.added?.element;
  const newIndex = event.moved?.newIndex ?? event.added?.newIndex;

  if (element && typeof newIndex === "number") {
    emits("postMoved", {
      postId: element.postId,
      toRoadmapId: props.roadmap.id,
      newIndex,
    });
  } else {
    console.warn("Unhandled drag event:", event);
  }
}

function handlePostCreated(newPost) {
  localPosts.value.push(newPost); // Add new post to local state
  console.log("New post added to localPosts:", newPost);
}
</script>

<style scoped>
.roadmap-column {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  width: 340px;
  box-shadow: 0 0 5px #ddd;
  margin: 16px;
}

.roadmap-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #333;
  padding: 8px;
}

.roadmap-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 70px;
}

.draggable-container {
  min-height: 80px;
}

.post-item {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid transparent;
  transition: all 0.2s;
  margin-top: 15px;
}

.post-item:hover {
  background: #f9f9f9;
}

.create-new-btn {
  width: 100%;
  padding: 8px;
  background: #fff;
  /* border: 1px solid #e0e0e0; */
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s;
}

.create-new-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.create-new-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>