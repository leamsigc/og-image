<script lang="ts" setup>
import { defineOgImage, useHead, useSeoMeta } from '#imports'

useHead({
  title: 'VIDEO',
  titleTemplate: '%s %separator %siteName',
  templateParams: {
    separator: '-',
    siteName: 'Harlan Wilton',
  },
})
useSeoMeta({
  // write 300 characters
  description: 'This is a description of the page. It can be a bit longer than the title.',
})

defineOgImage({
  component: "LoopingLogo",
  props: {
    text: '123',
  },
  extension: 'mp4',
})
</script>

<template>
  <div>
    Should it show a video as og image
  </div>
</template>
<style scoped></style>
