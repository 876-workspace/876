'use client'

import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'

import { NumberField, ToggleRow, UploadComingSoon } from './fields'
import type { TemplateTabProps } from './types'

export function OtherTab({ settings, patch, onInvalid }: TemplateTabProps) {
  const other = settings.otherDetails
  return (
    <div className="space-y-6">
      <section aria-label="Notes" className="space-y-4">
        <h3 className="text-sm font-semibold">Notes</h3>
        <ToggleRow
          id="notes-show"
          label="Show notes"
          checked={other.notes.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.notes.show = checked
            })
          }
        />
        <FormRow htmlFor="notes-label" label="Notes label">
          <Input
            id="notes-label"
            value={other.notes.label}
            onChange={(event) =>
              patch((draft) => {
                draft.otherDetails.notes.label = event.target.value
              })
            }
          />
        </FormRow>
        <NumberField
          id="notes-font-size"
          label="Notes font size"
          value={other.notes.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.otherDetails.notes.fontSize = value
            })
          }
        />
      </section>
      <section aria-label="Terms" className="space-y-4">
        <h3 className="text-sm font-semibold">Terms</h3>
        <ToggleRow
          id="terms-show"
          label="Show terms"
          checked={other.terms.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.terms.show = checked
            })
          }
        />
        <FormRow htmlFor="terms-label" label="Terms label">
          <Input
            id="terms-label"
            value={other.terms.label}
            onChange={(event) =>
              patch((draft) => {
                draft.otherDetails.terms.label = event.target.value
              })
            }
          />
        </FormRow>
        <NumberField
          id="terms-font-size"
          label="Terms font size"
          value={other.terms.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.otherDetails.terms.fontSize = value
            })
          }
        />
      </section>
      <section aria-label="Extras" className="space-y-1">
        <h3 className="text-sm font-semibold">Extras</h3>
        <ToggleRow
          id="other-show-payment-options"
          label="Show payment options"
          checked={other.showPaymentOptions}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.showPaymentOptions = checked
            })
          }
        />
        <ToggleRow
          id="other-show-bank-details"
          label="Show bank details"
          checked={other.showBankDetails}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.showBankDetails = checked
            })
          }
        />
        <ToggleRow
          id="other-show-qr-code"
          label="Show QR code"
          checked={other.showQrCode}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.showQrCode = checked
            })
          }
        />
      </section>
      <section aria-label="Signature" className="space-y-4">
        <h3 className="text-sm font-semibold">Signature</h3>
        <ToggleRow
          id="signature-show"
          label="Show signature"
          checked={other.signature.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.otherDetails.signature.show = checked
            })
          }
        />
        <FormRow htmlFor="signature-label" label="Signature label">
          <Input
            id="signature-label"
            value={other.signature.label}
            onChange={(event) =>
              patch((draft) => {
                draft.otherDetails.signature.label = event.target.value
              })
            }
          />
        </FormRow>
        <UploadComingSoon id="signature-image" label="Signature image" />
      </section>
    </div>
  )
}
