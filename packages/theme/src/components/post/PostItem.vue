<template>
  <div class="post">
    <vote :post-id="postData.postId" :votes-count="postData.voters.votesCount" :is-voted="isVoted"
      @update-voters="updateVoters" />
    <div class="post-content">
      <router-link class="post-content-link" data-test="post-link" :to="`${dashboardUrl}/posts/${postData.slug}`">
        <h5 class="post-content-title">
          {{ postData.title }}
        </h5>
      </router-link>
      <p data-test="post-description" class="post-content-description">
        {{ useTrim(postData.contentMarkdown, 120) }}
      </p>
      <div class="post-badges">
        <board-badge v-if="postData.board" :show-board="showBoard" :name="postData.board.name"
          :color="postData.board.color" :url="postData.board.url" />
        <span v-if="postData.roadmap" class="post-roadmap-badge" :style="{
          color: `#${postData.roadmap.color}`, 
          backgroundColor: getRgbaColor(postData.roadmap.color, 0.16)
        }">
          {{ postData.roadmap.name }} ({{ postData.voters.votesCount }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, withDefaults } from "vue";

import { useTrim } from "../../hooks";

// components
import Vote, { type VoteEventType } from "../vote/Vote.vue";
import BoardBadge from "../board/BoardBadge.vue";

interface Props {
  post: unknown;
  dashboard?: boolean;
  showBoard?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  dashboard: false,
  showBoard: true,
});

const postData = ref(props.post);
const dashboardUrl = computed(() => (props.dashboard ? "/dashboard" : ""));
const isVoted = computed<boolean>(() =>
  Boolean(props.post.voters?.viewerVote?.voteId),
);

// Add fallback for undefined fields
postData.value = {
  ...props.post,
  voters: props.post.voters || { votesCount: 0, viewerVote: false },
  contentMarkdown: props.post.contentMarkdown || "",
  slug: props.post.slug || "",
  board: props.post.board || { name: "Unknown", color: "999999", url: "#" },
  roadmap: props.post.roadmap || { name: "Unknown", color: "999999" },
};

// Helper function to convert hex to RGBA with opacity
function getRgbaColor(hex: string, opacity: number): string {
  hex = hex.replace("#", "");
  if (hex.length !== 6) return `rgba(0, 0, 0, ${opacity})`; // Fallback to black
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// TODO: Add TS types
function updateVoters(voters: VoteEventType) {
  postData.value.voters.votesCount = voters.votesCount;
  postData.value.voters.viewerVote = voters.viewerVote;
}
</script>

<style lang="sass">
.post
  display: flex
  align-items: flex-start
  padding: 1.25rem

  &:last-child
    margin-bottom: 0
    border-bottom: none

.post-content
  flex: 1
  margin-left: 1rem

.post-content-link
  text-decoration: none

.post-content-title
  color: var(--color-text-black)
  margin-bottom: 0.5rem
  font-size: 1.125rem
  font-weight: 600

.post-content-description
  margin-top: 0.5rem
  color: var(--color-gray-40)
  margin-bottom: 0.75rem
  font-size: 0.875rem

.post-badges
  display: flex
  align-items: center
  justify-content: flex-end
  gap: 0.5rem
  margin-top: 0.5rem

.post-roadmap-badge
  padding: 0.25rem 0.5rem
  border-radius: 4px
  font-size: 0.75rem
  font-weight: 500
</style>

<style lang="css">
.post {
  border-top: 1px solid #DEDEE7;
}

.post-roadmap-badge {
  color: white;
}
</style>