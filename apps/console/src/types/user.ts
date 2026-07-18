/** Display-only shape for the currently authenticated Console operator. */
export type ConsoleUser = {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
}
