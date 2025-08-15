<template>
  <div class="select-none overflow-hidden" @click="$emit('click')">
    <div data-test="avatar-image">
      <img
        :src="currentSrc"
        :alt="name"
        class="max-w-8 max-h-8 size-8 rounded-full pointer-events-none"
        @error="onImageError"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import user from "../../icons/user.svg";

const props = defineProps({
  src: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    required: true,
  },
});

const currentSrc = ref(user);

watch(
  () => props.src,
  (newVal) => {
    currentSrc.value = newVal || user;
  },
);

function onImageError() {
  currentSrc.value = user;
}
</script>
