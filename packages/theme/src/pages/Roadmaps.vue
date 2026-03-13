<template>
  <div>
    <div class="filter">
      <div class="roadmap-title">
        <h2>Roadmap</h2>
        <p>View : </p>
        <l-select
          v-model="selectedView"
          label=""
          :options="viewOptions"
          placeholder="Choose an option"
          class="view-select"
          @change="handleViewChange"
        />
        <input
          v-if="selectedView === 'quarterly'"
          v-model.number="selectedYear"
          type="number"
          @change="getRoadmaps"
          min="2023"
          max="2030"
          class="year-input"
          placeholder="Select Year"
        />
      </div>
      <div>
        <input/>
      </div>
    </div>

    <div v-if="roadmaps.length > 0" class="roadmap">
      <RoadmapColumn
        v-for="roadmap in roadmaps"
        :key="roadmap.id"
        :roadmap="roadmap"
        @postMoved="onPostMoved"
      />
    </div>

    <p v-if="roadmaps.length === 0">There are no roadmaps.</p>
  </div>
</template>

<script lang="ts">
export default {
  name: "Roadmaps",
};
</script>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useHead } from "@vueuse/head";

// stores & modules
import { getAllRoadmaps } from "../modules/roadmaps";
import { updatePost } from "../modules/posts";
import { useSettingStore } from "../store/settings";
// components
import InfiniteScroll, { InfiniteScrollStateType } from "../components/ui/InfiniteScroll.vue";
import RoadmapColumn from "../ee/components/roadmap/RoadmapColumn.vue";
import LSelect from "../components/ui/input/LSelect.vue";

const { get: siteSettings } = useSettingStore();
const roadmaps = ref<any[]>([]);
const state = ref<InfiniteScrollStateType>();
const selectedView = ref<string>("roadmap");
const selectedYear = ref<number>(new Date().getFullYear());
const viewOptions = ref([
  { id: "roadmap", name: "Roadmap" },
  { id: "quarterly", name: "Quarterly" },
]);

// Fetch roadmaps and store their posts
async function getRoadmaps() {
  state.value = "LOADING";

  try {
    const response = await getAllRoadmaps(
      selectedView.value,
      selectedView.value === "quarterly" ? selectedYear.value : null
    );
    roadmaps.value = response.data.result || [];
    state.value = roadmaps.value.length > 0 ? "LOADED" : "COMPLETED";
  } catch (err) {
    console.error(err);
    state.value = "ERROR";
  }
}

// Handle view change and trigger fetch
function handleViewChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  selectedView.value = value;
  getRoadmaps();
}

// Handle post drag-and-drop between columns
async function onPostMoved({
  postId,
  toRoadmapId,
  newIndex,
}: {
  postId: string;
  toRoadmapId: string;
  newIndex: number;
}) {
  try {
    await updatePost({
      id: postId,
      roadmap_id: toRoadmapId,
    });
    console.log("Post moved successfully");
    getRoadmaps(); // Refresh data after move
  } catch (err) {
    console.error("Failed to update post roadmap", err);
  }
}

useHead({
  title: "Roadmaps",
  meta: [
    {
      name: "og:title",
      content: () => `Roadmaps • ${siteSettings.title}`,
    },
  ],
});

onMounted(() => getRoadmaps());

// Watch for changes in view or year to trigger fetch
watch([selectedView, selectedYear], () => {
  getRoadmaps();
});
</script>

<style lang="sass">
.roadmap
  display: grid
  grid-auto-flow: column
  grid-auto-columns: minmax(22rem, 24rem)
  grid-column-gap: 1rem
  overflow-x: scroll
</style>

<style scoped lang="scss">
.filter {
  display: flex;
  align-items: center;
  justify-content: flex-start; // Inline alignment
  margin-bottom: 1rem;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.roadmap-title {
  display: flex;
  align-items: center;
  gap: 1rem; // Space between heading, dropdown, and input
  height: 40px; // Fixed height to align all elements
}

.roadmap-title h2 {
  margin: 0;
  font-size: 32px;
  font-weight: 500;
  line-height: 40px; // Match container height for vertical centering
  color: #333;
}

.view-select {
  width: 150px;
  height: 40px; // Match container height
  font-size: 0.875rem;
  // border: 1px solid #ccc;
  // border-radius: 4px;
  padding: 0 0.5rem; // Adjusted padding for vertical centering
  box-sizing: border-box;
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.year-input {
  width: 100px;
  height: 40px; // Match container height
  padding: 0 0.5rem; // Adjusted padding for vertical centering
  font-size: 0.875rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
  line-height: 40px; // Match container height
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #5443B1;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none; // Remove number input arrows
    margin: 0;
  }

  &[type="number"] {
    -moz-appearance: textfield; // Remove number input arrows in Firefox
  }
}

@media (max-width: 768px) {
  .filter {
    padding: 12px; // Slightly less padding on mobile
  }

  .roadmap-title {
    flex-wrap: wrap; // Allow wrapping on smaller screens
    gap: 0.5rem;
    height: auto; // Allow dynamic height on mobile
  }

  .view-select,
  .year-input {
    width: 100%;
    max-width: 150px;
    height: 36px; // Slightly smaller on mobile
    line-height: 36px; // Match height
  }

  .roadmap-title h2 {
    font-size: 24px; // Smaller heading on mobile
    line-height: 36px; // Match input heights
  }
}
</style>