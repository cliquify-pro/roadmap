<template>
  <div class="post-card">
    <div class="post-card-main">
      <Vote :post-id="postData.postId" :votes-count="postData.voters.votesCount" :is-voted="isVoted"
        @update-voters="updateVoters" />
      <div style="width: 100%">
        <div class="post-card-section">
          <div>
            <!-- <router-link data-test="post-link" :to="`/posts/${postData.slug}`">
              <h5>{{ postData.title }}</h5>
            </router-link> -->
            <span class="clickable-title" @click="openDrawer(postData.slug)">
              <h6>{{ postData.title }}</h6>
            </span>
            <span v-if="!isExpanded" data-test="post-board-name" class="post-card-board">
              {{ postData.board.name }}
            </span>
            <!-- <time
              v-else
              data-test="post-date"
              :datetime="postData.createdAt"
              :title="dayjs(postData.createdAt).format('dddd, DD MMMM YYYY hh:mm')"
              class="post-date"
            >
              {{ dayjs(postData.createdAt).fromNow() }}
            </time> -->
          </div>
          <div data-test="post-card-toggle" :style="{ transform: isExpanded ? 'rotateX(180deg)' : '' }"
            class="post-card-toggle" @click="isExpanded = !isExpanded">
            <arrow-top-icon />
          </div>
        </div>
        <p v-if="isExpanded" data-test="post-card-description" class="post-card-description">
          {{ useTrim(postData.contentMarkdown, 120) }}
        </p>
      </div>
    </div>

    <div v-if="isExpanded" data-test="post-card-extra" class="post-card-extra">
      <!-- <avatar-stack
        :avatars="postData.voters.votes"
        :total-count="postData.voters.votesCount"
      /> -->
      <div class="post-card-extra-right">
        <div>
          <board-badge :show-board="true" :name="postData.board.name" :color="postData.board.color"
            :url="postData.board.url" />
        </div>
        <div>
          <time v-if="postData.release_date" data-test="post-release-date" :datetime="postData.release_date"
            :title="dayjs(postData.release_date).format('dddd, DD MMMM YYYY hh:mm')" class="post-release-Date">
            {{ dayjs(postData.release_date).format('DD MMM YYYY') }}
          </time>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// packages
import { computed, ref } from "vue";
import { ChevronUp as ArrowTopIcon } from "lucide-vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useTrim } from "../../../hooks";

// components
import Vote, { type VoteEventType } from "../../../components/vote/Vote.vue";
import BoardBadge from "../../../components/board/BoardBadge.vue";
import { AvatarStack } from "../../../components/ui/Avatar";

dayjs.extend(relativeTime);

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
});

const isExpanded = ref(false);
const isVoted = computed<boolean>(() =>
  Boolean(props.post.voters?.viewerVote?.voteId),
);

// fallback-safe version of post
const postData = ref({
  ...props.post,
  voters: props.post.voters || {
    votesCount: 0,
    viewerVote: false,
    votes: [],
  },
  board: props.post.board || {
    name: "Unknown",
    color: "999999",
    url: "#",
  },
  release_date: props.post.release_date || null,
});

function updateVoters(voters: VoteEventType) {
  postData.value.voters.votesCount = voters.votesCount;
  postData.value.voters.viewerVote = voters.viewerVote;
}

const emit = defineEmits(["open-drawer"]);

function openDrawer(slug: string) {
  emit("open-drawer", slug);
}
</script>

<style lang="sass">
.post-card
  background-color: var(--color-white)
  margin-bottom: 0.75rem

  border: 1px solid #ccc
  border-radius:8px
  transition: all 0.2s

  &:last-child
    margin-bottom: 0

.post-card-main
  padding: 0.75rem
  display: flex
  align-items: self-start
  gap: 0.5rem

  h5
    color: var(--color-text-black)
    margin-bottom: 0.125em

.post-card-board
  text-transform: uppercase
  font-size: 0.7rem
  font-weight: 600
  color: var(--color-gray-70)

.post-card-section
  display: flex
  align-items: center
  width: 100%

.post-card-toggle
  margin-left: auto
  padding: 0.125rem
  cursor: pointer
  background-color: var(--color-gray-95)
  user-select: none
  border-radius: 1rem

  svg
    display: block
    stroke: var(--color-gray-60)

.post-card-description
  color: var(--color-gray-40)
  font-size: 0.875rem
  margin-top: 0.5rem

.post-card-extra
  padding: 0.75rem
  border-top: 1px solid var(--color-gray-95)
  align-items: center

  .board-badge
    margin-left: auto

  .post-release-Date
    font-size: 0.77rem
    color: var(--color-gray-40)

</style>
<style scoped>
.clickable-title {
  cursor: pointer;
  color: var(--color-primary);
}

.post-card-extra-right {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
</style>
