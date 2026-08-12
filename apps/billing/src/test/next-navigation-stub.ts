export function useRouter() {
  return {
    back() {},
    forward() {},
    prefetch() {
      return Promise.resolve()
    },
    push() {},
    refresh() {},
    replace() {},
  }
}

export function usePathname() {
  return '/'
}

export function useSearchParams() {
  return new URLSearchParams()
}

export function useParams() {
  return {}
}
