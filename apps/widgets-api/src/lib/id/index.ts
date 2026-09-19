import { createPrefixedId } from '@876/core/id'

export function noteId() {
  return createPrefixedId('wnote')
}

export function collectionId() {
  return createPrefixedId('wcol')
}

export function auditId() {
  return createPrefixedId('waudit')
}

export function unixSeconds(date = new Date()) {
  return Math.floor(date.getTime() / 1000)
}
