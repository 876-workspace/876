import { defineNavigation } from '@876/core/access'
export const navConfig = defineNavigation([
  {
    key: 'workspace',
    entries: [
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-blue-500',
      },
    ],
  },
])
