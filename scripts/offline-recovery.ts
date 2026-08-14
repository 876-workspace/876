const retry = document.querySelector<HTMLButtonElement>('[data-offline-retry]')

if (retry) {
  let isRecovering = false

  function recover() {
    if (isRecovering) return

    isRecovering = true
    retry.disabled = true
    retry.textContent = 'Reconnecting...'
    window.location.reload()
  }

  retry.addEventListener('click', recover)
  window.addEventListener('online', recover, { once: true })
}
