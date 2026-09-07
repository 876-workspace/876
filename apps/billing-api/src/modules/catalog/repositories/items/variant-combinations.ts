import type { ItemVariantOptionInput } from '../../schemas/item'

export interface VariantCombination {
  name: string
  values: string[]
}

export function variantCombinationKey(values: readonly string[]): string {
  return values.map((value) => value.trim().toLocaleLowerCase()).join('\u001f')
}

/** Produces the Cartesian product in option/value display order. */
export function buildVariantCombinations(
  options: readonly ItemVariantOptionInput[]
): VariantCombination[] {
  let combinations: string[][] = [[]]

  for (const option of options) {
    combinations = combinations.flatMap((prefix) =>
      option.values.map((value) => [...prefix, value])
    )
  }

  return combinations.map((values) => ({
    name: values.join(' / '),
    values,
  }))
}
