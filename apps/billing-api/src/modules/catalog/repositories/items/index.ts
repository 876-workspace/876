import { adjustStock } from './adjust-stock'
import { create } from './create'
import { deleteItem } from './delete'
import { list } from './list'
import { media } from './media'
import { retrieve } from './retrieve'
import { searchVariants } from './search-variants'
import { update } from './update'
import { hasVariantConversionBlockers } from './variant-conversion'
import { variants } from './variants'

export const items = {
  create,
  retrieve,
  list,
  update,
  adjustStock,
  variants: {
    ...variants,
    search: searchVariants,
    hasConversionBlockers: hasVariantConversionBlockers,
  },
  media,
  delete: deleteItem,
}
