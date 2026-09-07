type VariantOptionValueRow = {
  option: { id: string; name: string; position: number }
  optionValue: { id: string; value: string; position: number }
}

type VariantMediaRow = { fileId: string; position: number }

type VariantParentRow = {
  id: string
  name: string
  unit: string | null
  defaultSellingAmount: bigint | null
  defaultSellingCurrency: string | null
  defaultCostAmount: bigint | null
  defaultCostCurrency: string | null
  trackStock: boolean
  lowStockThreshold: number | null
  allowOutOfStock: boolean
}

type VariantRow = {
  id: string
  itemId: string
  name: string
  sku: string | null
  defaultSellingAmount: bigint | null
  defaultSellingCurrency: string | null
  defaultCostAmount: bigint | null
  defaultCostCurrency: string | null
  stockQuantity: number | null
  isActive: boolean
  createdAt: number
  updatedAt: number
  optionValues: VariantOptionValueRow[]
  media: VariantMediaRow[]
  item?: VariantParentRow
}

type MediaRow = {
  id: string
  fileId: string
  position: number
  createdAt: number
  updatedAt: number
}

function amount(value: bigint | null) {
  return value === null ? null : value.toString()
}

export function serializeItemVariant(row: VariantRow) {
  const options = [...row.optionValues]
    .sort((left, right) => left.option.position - right.option.position)
    .map((entry) => ({
      optionId: entry.option.id,
      name: entry.option.name,
      valueId: entry.optionValue.id,
      value: entry.optionValue.value,
      position: entry.option.position,
    }))

  return {
    object: 'item_variant' as const,
    id: row.id,
    itemId: row.itemId,
    name: row.name,
    sku: row.sku,
    defaultSellingAmount: amount(row.defaultSellingAmount),
    defaultSellingCurrency: row.defaultSellingCurrency,
    defaultCostAmount: amount(row.defaultCostAmount),
    defaultCostCurrency: row.defaultCostCurrency,
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    options,
    media: [...row.media]
      .sort((left, right) => left.position - right.position)
      .map((entry) => ({ fileId: entry.fileId, position: entry.position })),
    ...(row.item
      ? {
          item: {
            id: row.item.id,
            name: row.item.name,
            unit: row.item.unit,
            defaultSellingAmount: amount(row.item.defaultSellingAmount),
            defaultSellingCurrency: row.item.defaultSellingCurrency,
            defaultCostAmount: amount(row.item.defaultCostAmount),
            defaultCostCurrency: row.item.defaultCostCurrency,
            trackStock: row.item.trackStock,
            lowStockThreshold: row.item.lowStockThreshold,
            allowOutOfStock: row.item.allowOutOfStock,
          },
        }
      : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function itemVariantList(rows: VariantRow[], url: string) {
  return {
    object: 'list' as const,
    data: rows.map(serializeItemVariant),
    has_more: false,
    total_count: rows.length,
    url,
  }
}

export function itemMediaList(rows: MediaRow[], url: string) {
  return {
    object: 'list' as const,
    data: [...rows]
      .sort((left, right) => left.position - right.position)
      .map((row) => ({
        object: 'item_media' as const,
        id: row.id,
        fileId: row.fileId,
        position: row.position,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    has_more: false,
    total_count: rows.length,
    url,
  }
}
