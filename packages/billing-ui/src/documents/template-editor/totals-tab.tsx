'use client'

import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'

import {
  ColorField,
  NullableColorField,
  NumberField,
  ToggleRow,
} from './fields'
import type { TemplateTabProps } from './types'

export function TotalsTab({ settings, patch, onInvalid }: TemplateTabProps) {
  const totals = settings.totals
  return (
    <div className="space-y-6">
      <section aria-label="Totals options" className="space-y-1">
        <h3 className="text-sm font-semibold">Options</h3>
        <ToggleRow
          id="totals-show"
          label="Show totals"
          checked={totals.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.show = checked
            })
          }
        />
        <ToggleRow
          id="totals-show-payment-details"
          label="Show payment details"
          checked={totals.showPaymentDetails}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.showPaymentDetails = checked
            })
          }
        />
        <ToggleRow
          id="totals-show-amount-in-words"
          label="Show amount in words"
          checked={totals.showAmountInWords}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.showAmountInWords = checked
            })
          }
        />
        <ToggleRow
          id="totals-show-currency-symbol"
          label="Show currency symbol"
          checked={totals.showCurrencySymbol}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.showCurrencySymbol = checked
            })
          }
        />
        <ToggleRow
          id="totals-show-quantity-total"
          label="Show quantity total"
          checked={totals.showQuantityTotal}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.showQuantityTotal = checked
            })
          }
        />
        <ToggleRow
          id="totals-show-tax-summary"
          label="Show tax summary"
          checked={totals.showTaxSummary}
          onChange={(checked) =>
            patch((draft) => {
              draft.totals.showTaxSummary = checked
            })
          }
        />
      </section>
      <section aria-label="Totals labels" className="space-y-4">
        <h3 className="text-sm font-semibold">Labels</h3>
        <FormRow htmlFor="totals-subtotal-label" label="Subtotal label">
          <Input
            id="totals-subtotal-label"
            value={totals.subtotalLabel}
            onChange={(event) =>
              patch((draft) => {
                draft.totals.subtotalLabel = event.target.value
              })
            }
          />
        </FormRow>
        <FormRow htmlFor="totals-total-label" label="Total label">
          <Input
            id="totals-total-label"
            value={totals.totalLabel}
            onChange={(event) =>
              patch((draft) => {
                draft.totals.totalLabel = event.target.value
              })
            }
          />
        </FormRow>
        <FormRow htmlFor="totals-balance-due-label" label="Balance due label">
          <Input
            id="totals-balance-due-label"
            value={totals.balanceDueLabel}
            onChange={(event) =>
              patch((draft) => {
                draft.totals.balanceDueLabel = event.target.value
              })
            }
          />
        </FormRow>
      </section>
      <section aria-label="Total style" className="space-y-4">
        <h3 className="text-sm font-semibold">Total style</h3>
        <NumberField
          id="totals-total-font-size"
          label="Total font size"
          value={totals.totalStyle.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.totalStyle.fontSize = value
            })
          }
        />
        <ColorField
          id="totals-total-font-color"
          label="Total font color"
          value={totals.totalStyle.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.totalStyle.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="totals-total-background-color"
          label="Total background"
          value={totals.totalStyle.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.totalStyle.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
      </section>
      <section aria-label="Balance due style" className="space-y-4">
        <h3 className="text-sm font-semibold">Balance due style</h3>
        <NumberField
          id="totals-balance-font-size"
          label="Balance due font size"
          value={totals.balanceDueStyle.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.balanceDueStyle.fontSize = value
            })
          }
        />
        <ColorField
          id="totals-balance-font-color"
          label="Balance due font color"
          value={totals.balanceDueStyle.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.balanceDueStyle.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="totals-balance-background-color"
          label="Balance due background"
          value={totals.balanceDueStyle.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.totals.balanceDueStyle.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
      </section>
    </div>
  )
}
