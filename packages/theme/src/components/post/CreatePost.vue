<template>
  <div class="card">
    <l-text v-model="title.value" label="Title" type="text" name="Post title" data-test="post-title"
      placeholder="Name of the ideas" :error="title.error" :disabled="createPostPermissionDisabled"
      @keyup-enter="submitPost" @hide-error="hideTitleError" />
    <l-textarea v-model="description" label="Description" rows="4" name="Post description"
      placeholder="What would you use it for?" :disabled="createPostPermissionDisabled" />
    <div class="media-upload">
      <input type="file" ref="fileInput" accept="image/*,video/*" @change="handleFileUpload"
        :disabled="createPostPermissionDisabled" class="file-input" />
      <Button type="secondary" :disabled="createPostPermissionDisabled" @click="triggerFileUpload" style="border: 1px solid black;">
        Upload Media
      </Button>
      <div v-if="mediaUrl" class="media-preview">
        <span>Preview:</span>
        <img :src="mediaUrl" alt="Media Preview" class="preview-image" />
      </div>
    </div>

    <div class="tags">
      <l-select v-model="selectedBoardId" label="Select Tag" :options="boards"
        :disabled="createPostPermissionDisabled || !boards.length || state === 'LOADING'" placeholder="Select the tag"
        :loading="state === 'LOADING'" @change="onBoardChange" />
      <l-select v-model="selectedRoadmapId" label="Select Roadmap" :options="roadmaps"
        :disabled="createPostPermissionDisabled || !roadmaps.length || state === 'LOADING'"
        placeholder="Select the roadmap" :loading="state === 'LOADING'" />
    </div>

    <div class="date-row">
      <l-date-picker v-model="postDate" label="Date" :disabled="createPostPermissionDisabled" :error="dateError" />
      <l-date-picker v-model="releaseDate" label="Release Date (Optional)" :disabled="createPostPermissionDisabled" />
    </div>
    <div class="switch-container">
      <label for="publicSwitch" class="switch-label">Public</label>
      <input id="publicSwitch" v-model="publicStatus" type="checkbox" class="switch"
        :disabled="createPostPermissionDisabled" />
    </div>
    <div style="display: flex; justify-content: center;">
      <Button type="primary" data-test="create-post-button" :loading="loading"
        :disabled="createPostPermissionDisabled || !selectedBoardId || state === 'LOADING' || !isFormValid"
        @click="submitPost">
        Submit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";

// modules
import { createPost } from "../../modules/posts";
import { getAllBoards } from "../../ee/modules/boards";
import { useUserStore } from "../../store/user";
import { router } from "../../router";

// components
import type { FormFieldErrorType } from "../ui/input/formBaseProps";
import LText from "../ui/input/LText.vue";
import LTextarea from "../ui/input/LTextarea.vue";
import LSelect from "../ui/input/LSelect.vue";
import LDatePicker from "../ui/input/LDatePicker.vue";
import Button from "../ui/Button.vue";
import axios from "axios";

// utils
import validateUUID from "../../utils/validateUUID";
import tokenError from "../../utils/tokenError";
import { VITE_API_URL } from "../../constants";

const { permissions, getUserId } = useUserStore();

const props = defineProps({
  boardId: {
    type: String,
    required: false,
    validator: validateUUID,
  },
  roadmapId: {
    type: String,
    required: false,
    validator: validateUUID,
  },
  roadmaps: {
    type: Array as () => { id: string; name: string }[],
    required: true,
  },
});

const emit = defineEmits(["post-created"]);

const title = reactive({
  value: "",
  error: {
    show: false,
    message: "",
  },
});
const description = ref<string>("");
const loading = ref<boolean>(false);
const selectedBoardId = ref<string>(props.boardId || "");
const boards = ref<{ id: string; name: string }[]>([]);
const selectedRoadmapId = ref<string>(props.roadmapId || "");
const roadmaps = ref<{ id: string; name: string }[]>(props.roadmaps);
const postDate = ref<string>("");
const releaseDate = ref<string | null>(null);
const publicStatus = ref<boolean>(true);
const page = ref<number>(1);
const state = ref<"LOADING" | "LOADED" | "COMPLETED" | "ERROR">("LOADING");
const fileInput = ref<HTMLInputElement | null>(null);
const mediaUrl = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const dateError = ref<FormFieldErrorType>({ show: false, message: "" });

const createPostPermissionDisabled = computed(() => {
  return !permissions.includes("post:create");
});

const isFormValid = computed(() => {
  return (
    title.value &&
    selectedBoardId.value &&
    postDate.value &&
    (!props.roadmapId || selectedRoadmapId.value)
  );
});

function hideTitleError(event: FormFieldErrorType) {
  title.error = event;
}

function onBoardChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  selectedBoardId.value = value;
}

function triggerFileUpload() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    selectedFile.value = file;
    mediaUrl.value = URL.createObjectURL(file);
  }
}

async function getBoards() {
  state.value = "LOADING";

  try {
    const response = await getAllBoards({
      page: page.value,
      sort: "DESC",
    });

    if (response.data.boards.length) {
      boards.value.push(
        ...response.data.boards.map((board: any) => ({
          id: board.boardId,
          name: board.name,
        })),
      );
      page.value += 1;
      state.value = "LOADED";
    } else {
      state.value = "COMPLETED";
    }
  } catch (error) {
    console.error("Failed to fetch boards:", error);
    state.value = "ERROR";
  }
}

async function submitPost() {
  if (!title.value) {
    title.error.show = true;
    title.error.message = "You forgot to enter a post title";
    return;
  }
  if (!selectedBoardId.value) {
    console.error("Please select a board");
    return;
  }
  if (!postDate.value) {
    dateError.value = { show: true, message: "Date is required" };
    return;
  }

  loading.value = true;

  try {
    const postPayload = {
      title: title.value,
      contentMarkdown: description.value,
      roadmapId: selectedRoadmapId.value || null,
      date: postDate.value,
      release_date: releaseDate.value || null,
      public: publicStatus.value ? "Yes" : "No",
    };

    const postRes = await createPost(selectedBoardId.value, postPayload);
    const newPost = postRes.data.post;
    const postId = newPost.postId;

    let uploadedMediaUrl = null;

    if (selectedFile.value && postId) {
      const formData = new FormData();
      formData.append("file", selectedFile.value);

      const uploadRes = await axios.post(
        `${VITE_API_URL}/api/v1/upload/${postId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${useUserStore().authToken}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (uploadRes.data.success) {
        uploadedMediaUrl = uploadRes.data.url;
        await axios.patch(
          `${VITE_API_URL}/api/v1/posts/${postId}`,
          {
            title: title.value,
            contentMarkdown: description.value,
            boardId: selectedBoardId.value,
            roadmapId: selectedRoadmapId.value || null,
            date: postDate.value,
            release_date: releaseDate.value || null,
            public: publicStatus.value ? "Yes" : "No",
            media_url: uploadedMediaUrl,
          },
          {
            headers: {
              Authorization: `Bearer ${useUserStore().authToken}`,
            },
          },
        );
        mediaUrl.value = uploadedMediaUrl;
      }
    }

    emit("post-created", { ...newPost, media_url: uploadedMediaUrl });
  } catch (error) {
    console.error(
      "Error during submission:",
      error.response?.data || error.message,
    );
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getBoards();
  selectedRoadmapId.value = props.roadmapId || ""; // Pre-select if roadmapId is provided
});

watch(
  () => props.roadmapId,
  (newRoadmapId) => {
    selectedRoadmapId.value = newRoadmapId || "";
  },
);
</script>

<style scoped>
.description-container {
  margin-bottom: 1rem;
}

.media-upload {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-input {
  display: none;
}

.media-preview {
  font-size: 0.875rem;
  color: #555;
  padding: 10px;
}

.date-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.switch-container {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.switch-label {
  font-weight: 500;
}

.switch {
  position: relative;
  width: 50px;
  height: 24px;
  appearance: none;
  background-color: #ccc;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.switch:checked {
  background-color: #4CAF50;
}

.switch::after {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.switch:checked::after {
  transform: translateX(26px);
}

.switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 0.5rem;
  object-fit: cover;
}
.tags{
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>