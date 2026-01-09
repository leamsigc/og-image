<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  text?: string
}>(), {
  text: 'Nuxt OG Image',
})

const letters = computed(() => props.text.split(''))
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-full bg-background">
    <!-- Logo icon - static -->
    <div class="flex mb-6">
      <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
        <path
          d="M50 15 C20 15, 10 45, 30 65 C45 80, 70 75, 75 55 C80 35, 60 25, 50 35 C40 45, 45 60, 55 60 C65 60, 70 50, 65 42"
          stroke="#2dd4bf" stroke-width="8" stroke-linecap="round" fill="none" />
      </svg>
    </div>

    <!-- Wave text - staggered loop with delay -->
    <!-- 1000ms loop = 3 exact cycles in 3s video for seamless loop -->
    <!-- 125ms stagger per letter = full wave spans one cycle -->
    <div class="flex items-center">
      <div v-for="(letter, i) in letters" :key="i"
        :class="`text-8xl font-black text-foreground tracking-tight loop-float/1000/${i * 125}`">
        {{ letter }}
      </div>
    </div>

    <!-- Tagline -->
    <div class="text-2xl text-muted-foreground mt-6">
      Generate images & videos with code
    </div>
  </div>
</template>
<style scoped></style>
