export function redirect() {
  throw new Error('redirect')
}
export function notFound() {
  throw new Error('notFound')
}
export const useRouter = () => ({ push: () => {}, replace: () => {} })
export const useSearchParams = () => new URLSearchParams()
export const usePathname = () => '/'
