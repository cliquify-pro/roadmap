<template>
  <div v-if="visible" class="offcanvas-wrapper">
    <!-- Overlay for outside click -->
    <div class="overlay" @click="handleOverlayClick" />

    <div class="drawer">
      <div class="drawer-header">
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="drawer-body">
        <h5>Tell us your Idea!</h5>
        <CreatePost
          v-if="getUserId"
          :board-id="boardId"
          :roadmap-id="roadmapId"
          :roadmaps="roadmaps"
          @post-created="handlePostCreated"
        />
        <p v-else>Please log in to create a post.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import CreatePost from "./CreatePost.vue";
import { useUserStore } from "../../store/user";
import { getAllRoadmaps } from "../../modules/roadmaps";

const props = defineProps<{
  visible: boolean;
  boardId: string;
  roadmapId: string;
}>();

const emit = defineEmits(["close", "post-created"]);

const { getUserId } = useUserStore();
const roadmaps = ref<{ id: string; name: string }[]>([]);

function close() {
  emit("close");
}

function handlePostCreated(newPost) {
  emit("post-created", newPost);
  emit("close");
}

function handleOverlayClick(event: MouseEvent) {
  const drawer = (event.target as HTMLElement).closest(".drawer");
  if (!drawer) {
    emit("close");
  }
}

async function fetchRoadmaps() {
  try {
    const response = await getAllRoadmaps();
    roadmaps.value = response.data.result.map((roadmap: any) => ({
      id: roadmap.id,
      name: roadmap.name,
    }));
  } catch (error) {
    console.error("Failed to fetch roadmaps:", error);
  }
}

onMounted(() => {
  fetchRoadmaps();
});
</script>

<style scoped>
.offcanvas-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 9999;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: 800px;
  height: 100vh;
  background-color: #fff;
  z-index: 10001;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.drawer-header {
  padding: 1rem;
  text-align: right;
  border-bottom: 1px solid #eee;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
}

.drawer-body {
  padding: 1rem;
}
</style>