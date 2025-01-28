import { createApp } from 'vue';
import App from './App.vue';
import Slide from '@/components/Slide.vue'

import "@/assets/style.scss"

const app = createApp(App);

app.component('Slide', Slide);

app.mount('#app');
