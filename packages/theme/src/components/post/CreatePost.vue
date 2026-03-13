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
      <Button type="secondary" :disabled="createPostPermissionDisabled" @click="triggerFileUpload" class="upload-button">
        <UploadCloud class="upload-icon" />
        Upload Media
      </Button>
      <div v-if="mediaUrl" class="media-preview">
        <span class="preview-label">Preview:</span>
        <div class="preview-container">
          <img v-if="isImage" :src="mediaUrl" alt="Media Preview" class="preview-media" />
          <video v-else-if="isVideo" :src="mediaUrl" controls class="preview-media" />
        </div>
      </div>
    </div>
    <div v-if="user.isOwner">
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
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div style="display: flex; justify-content: center;">
      <Button type="primary" data-test="create-post-button" :loading="loading"
        :disabled="createPostPermissionDisabled || !isFormValid"
        @click="submitPost">
        Submit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";
import { UploadCloud } from "lucide-vue";

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

const { permissions, getUserId, user } = useUserStore();

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
const errorMessage = ref<string | null>(null);
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
const selectedFile = ref<File | null>(null);
const dateError = ref<FormFieldErrorType>({ show: false, message: "" });

const isImage = computed(() => {
  return selectedFile.value?.type.startsWith("image/");
});

const isVideo = computed(() => {
  return selectedFile.value?.type.startsWith("video/");
});

const createPostPermissionDisabled = computed(() => {
  return !permissions.includes("post:create");
});

const isFormValid = computed(() => {
  const valid = user.isOwner
    ? !!title.value?.trim() &&
      !!description.value?.trim() &&
      !!selectedBoardId.value &&
      !!postDate.value
    : !!title.value?.trim() && !!description.value?.trim();
  console.log("isFormValid:", valid, {
    title: title.value,
    description: description.value,
    boardId: selectedBoardId.value,
    postDate: postDate.value,
    isOwner: user.isOwner,
  });
  return valid;
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
    selectedFile.value = target.files[0];
    mediaUrl.value = URL.createObjectURL(selectedFile.value);
    console.log("Selected file:", selectedFile.value?.name);
  }
}

async function getBoards() {
  if (!user.isOwner) return; // Skip for non-owners
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
      if (!selectedBoardId.value && boards.value.length) {
        selectedBoardId.value = boards.value[0].id; // Default to first board
      }
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
  console.log("submitPost called, isOwner:", user.isOwner);
  console.log("Payload:", {
    title: title.value,
    description: description.value,
    boardId: selectedBoardId.value,
    roadmapId: selectedRoadmapId.value,
    postDate: postDate.value,
    releaseDate: releaseDate.value,
    public: publicStatus.value,
    file: selectedFile.value?.name,
  });

  if (!title.value?.trim()) {
    title.error.show = true;
    title.error.message = "You forgot to enter a post title";
    console.log("Validation failed: Title is empty");
    return;
  }
  if (user.isOwner && !selectedBoardId.value) {
    errorMessage.value = "Please select a board";
    console.error("Validation failed: Board not selected");
    return;
  }
  if (user.isOwner && !postDate.value) {
    dateError.value = { show: true, message: "Date is required" };
    console.error("Validation failed: Date not selected");
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    const postPayload = {
      title: title.value.trim(),
      contentMarkdown: description.value.trim(),
      boardId: selectedBoardId.value || boards.value[0]?.id || null,
      roadmapId: selectedRoadmapId.value || null,
      date: postDate.value || new Date().toISOString().split("T")[0],
      release_date: releaseDate.value || null,
      public: publicStatus.value ? "Yes" : "No",
    };

    console.log("Sending post payload:", postPayload);
    const postRes = await createPost(postPayload.boardId, postPayload);
    const newPost = postRes.data.post;
    const postId = newPost.postId;

    let uploadedMediaUrl = null;
    if (selectedFile.value && postId) {
      const formData = new FormData();
      formData.append("file", selectedFile.value);

      console.log(
        "Uploading media to:",
        `${VITE_API_URL}/api/v1/upload/${postId}`,
      );
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
        console.log("Patching post with media_url:", uploadedMediaUrl);
        await axios.patch(
          `${VITE_API_URL}/api/v1/posts/${postId}`,
          {
            ...postPayload,
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

    console.log("Post created:", newPost);
    emit("post-created", { ...newPost, media_url: uploadedMediaUrl });

    // Reset form
    title.value = "";
    description.value = "";
    selectedBoardId.value = props.boardId || boards.value[0]?.id || "";
    selectedRoadmapId.value = props.roadmapId || "";
    postDate.value = "";
    releaseDate.value = null;
    publicStatus.value = true;
    mediaUrl.value = null;
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
  } catch (error) {
    console.error(
      "Error during submission:",
      error.response?.data || error.message,
    );
    errorMessage.value =
      error.response?.data?.message ||
      "Failed to create post. Please try again.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getBoards();
  selectedRoadmapId.value = props.roadmapId || "";
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

.upload-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  transition: all 0.2s ease;
}

.upload-button:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-icon {
  width: 18px;
  height: 18px;
  stroke: #374151;
}

.media-preview {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 0.5rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

.preview-media {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
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

.tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-message {
  color: red;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
}
</style>