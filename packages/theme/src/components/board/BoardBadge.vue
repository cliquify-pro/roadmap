<template>
  <router-link v-if="showBoard" data-test="board-badge" class="block select-none truncate" :to="`/boards/${url}`">
    <div class="flex items-center px-2 py-1 rounded-full" :style="{ backgroundColor: getRgbaColor(color, 0.16), borderRadius:'4px' }">
      <div class="color-dot" data-test="board-badge-color" :style="{
        backgroundColor: `#${color}`
      }" />
      <p class="ml-2 text-sm text-(--color-gray-40)" data-test="board-badge-name">
        {{ name }}
      </p>
    </div>
  </router-link>
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
    validator: (value: string) => {
      return value.length === 6;
    },
  },
  url: {
    type: String,
    required: true,
  },
  showBoard: {
    type: Boolean,
    required: true,
  },
});

// Helper function to convert hex to RGBA with opacity
function getRgbaColor(hex: string, opacity: number): string {
  hex = hex.replace("#", "");
  if (hex.length !== 6) return `rgba(0, 0, 0, ${opacity})`; // Fallback to black
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
</script>

<style lang="sass">
.color-dot
  width: 8px
  height: 8px
  border-radius: 50%
</style>