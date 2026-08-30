import { redirect } from 'next/navigation'

export const metadata = { title: 'Add Category - Settings' }

export default function NewCategoryPage() {
  redirect('/settings/categories?category=new')
}
