'use client'

import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Switch } from '@876/ui/switch'

import { ColorField, ContentField, NumberField, ToggleRow } from './fields'
import type { TemplateTabProps } from './types'

export function DetailsTab({ settings, patch, onInvalid }: TemplateTabProps) {
  const organization = settings.organization
  const customer = settings.customer
  const documentDetails = settings.documentDetails
  return (
    <div className="space-y-6">
      <section aria-label="Organization" className="space-y-4">
        <h3 className="text-sm font-semibold">Organization</h3>
        <ToggleRow
          id="org-show-logo"
          label="Show logo"
          checked={organization.showLogo}
          onChange={(checked) =>
            patch((draft) => {
              draft.organization.showLogo = checked
            })
          }
        />
        <NumberField
          id="org-logo-height"
          label="Logo height (px)"
          value={organization.logoHeight}
          min={24}
          max={240}
          onChange={(value) =>
            patch((draft) => {
              draft.organization.logoHeight = value
            })
          }
        />
        <ToggleRow
          id="org-show-name"
          label="Show organization name"
          checked={organization.showName}
          onChange={(checked) =>
            patch((draft) => {
              draft.organization.showName = checked
            })
          }
        />
        <NumberField
          id="org-name-font-size"
          label="Organization name font size"
          value={organization.name.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.organization.name.fontSize = value
            })
          }
        />
        <ColorField
          id="org-name-font-color"
          label="Organization name color"
          value={organization.name.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.organization.name.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <ToggleRow
          id="org-show-address"
          label="Show address"
          checked={organization.showAddress}
          onChange={(checked) =>
            patch((draft) => {
              draft.organization.showAddress = checked
            })
          }
        />
        <ContentField
          id="org-address-format"
          label="Address format"
          value={organization.addressFormat}
          onChange={(value) =>
            patch((draft) => {
              draft.organization.addressFormat = value
            })
          }
        />
      </section>
      <section aria-label="Customer" className="space-y-4">
        <h3 className="text-sm font-semibold">Customer</h3>
        <NumberField
          id="customer-name-font-size"
          label="Customer name font size"
          value={customer.name.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.customer.name.fontSize = value
            })
          }
        />
        <ColorField
          id="customer-name-font-color"
          label="Customer name color"
          value={customer.name.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.customer.name.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <ToggleRow
          id="customer-show-bill-to"
          label="Show bill to"
          checked={customer.showBillTo}
          onChange={(checked) =>
            patch((draft) => {
              draft.customer.showBillTo = checked
            })
          }
        />
        <FormRow htmlFor="customer-bill-to-label" label="Bill to label">
          <Input
            id="customer-bill-to-label"
            value={customer.billToLabel}
            onChange={(event) =>
              patch((draft) => {
                draft.customer.billToLabel = event.target.value
              })
            }
          />
        </FormRow>
        <ContentField
          id="customer-billing-address-format"
          label="Billing address format"
          value={customer.billingAddressFormat}
          onChange={(value) =>
            patch((draft) => {
              draft.customer.billingAddressFormat = value
            })
          }
        />
        <ToggleRow
          id="customer-show-ship-to"
          label="Show ship to"
          checked={customer.showShipTo}
          onChange={(checked) =>
            patch((draft) => {
              draft.customer.showShipTo = checked
            })
          }
        />
        <FormRow htmlFor="customer-ship-to-label" label="Ship to label">
          <Input
            id="customer-ship-to-label"
            value={customer.shipToLabel}
            onChange={(event) =>
              patch((draft) => {
                draft.customer.shipToLabel = event.target.value
              })
            }
          />
        </FormRow>
        <ContentField
          id="customer-shipping-address-format"
          label="Shipping address format"
          value={customer.shippingAddressFormat}
          onChange={(value) =>
            patch((draft) => {
              draft.customer.shippingAddressFormat = value
            })
          }
        />
      </section>
      <section aria-label="Document details" className="space-y-4">
        <h3 className="text-sm font-semibold">Document details</h3>
        <ToggleRow
          id="details-show-title"
          label="Show title"
          checked={documentDetails.showTitle}
          onChange={(checked) =>
            patch((draft) => {
              draft.documentDetails.showTitle = checked
            })
          }
        />
        <FormRow htmlFor="details-title" label="Document title">
          <Input
            id="details-title"
            value={documentDetails.title}
            onChange={(event) =>
              patch((draft) => {
                draft.documentDetails.title = event.target.value
              })
            }
          />
        </FormRow>
        <NumberField
          id="details-title-font-size"
          label="Title font size"
          value={documentDetails.titleStyle.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.documentDetails.titleStyle.fontSize = value
            })
          }
        />
        <ColorField
          id="details-title-font-color"
          label="Title color"
          value={documentDetails.titleStyle.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.documentDetails.titleStyle.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <ul className="space-y-3">
          {documentDetails.fields.map((field) => (
            <li key={field.key} className="flex items-center gap-3">
              <Switch
                aria-label={`Show ${field.key} field`}
                checked={field.show}
                onCheckedChange={(checked) =>
                  patch((draft) => {
                    const entry = draft.documentDetails.fields.find(
                      (item) => item.key === field.key
                    )
                    if (entry) entry.show = checked
                  })
                }
              />
              <span className="text-muted-foreground w-28 shrink-0 text-sm">
                {field.key}
              </span>
              <Input
                aria-label={`${field.key} label`}
                value={field.label}
                onChange={(event) =>
                  patch((draft) => {
                    const entry = draft.documentDetails.fields.find(
                      (item) => item.key === field.key
                    )
                    if (entry) entry.label = event.target.value
                  })
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
