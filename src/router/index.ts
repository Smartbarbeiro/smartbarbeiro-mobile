import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { getToken, isOnboardingComplete } from '@/services/storage';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/bootstrap',
  },
  {
    path: '/bootstrap',
    name: 'Bootstrap',
    component: () => import('@/views/BootstrapPage.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingPage.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
  },
  {
    path: '/qr-scan',
    name: 'QrScan',
    component: () => import('@/views/QrScanPage.vue'),
  },
  {
    path: '/plan/:username',
    name: 'PlanBuilder',
    component: () => import('@/views/PlanBuilderPage.vue'),
    props: true,
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  if (to.name === 'Bootstrap') {
    return true;
  }

  const token = await getToken();
  const onboardingDone = await isOnboardingComplete();

  if (to.meta.requiresAuth && !token) {
    return onboardingDone ? { name: 'Login' } : { name: 'Onboarding' };
  }

  if (token && (to.name === 'Login' || to.name === 'Onboarding')) {
    return { name: 'Home' };
  }

  return true;
});

export default router;
