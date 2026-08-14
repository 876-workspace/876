import { create } from './create'
import { deleteQuote } from './delete'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

export const quotes = { create, list, retrieve, update, delete: deleteQuote }
