'use client'

import type {
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import {
  DOCUMENT_TEMPLATE_FONTS,
  IMAGE_POSITIONS,
  ORIENTATIONS,
  PAPER_SIZES,
} from '@876/core/document-templates'
import { FormRow } from '@876/ui/form-row'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import {
  ColorField,
  FONT_LABELS,
  IMAGE_POSITION_LABELS,
  NumberField,
  ORIENTATION_LABELS,
  PAPER_LABELS,
  ToggleRow,
  UploadComingSoon,
} from './fields'
import type { TemplateTabProps } from './types'

export function GeneralTab({
  settings,
  patch,
  onInvalid,
  documentType,
}: TemplateTabProps & { documentType: DocumentTemplateType }) {
  const general = settings.general
  return (
    <div className="space-y-4">
      <FormRow label="Paper size">
        <RadioGroup
          value={general.paperSize}
          onValueChange={(value) =>
            patch((draft) => {
              draft.general.paperSize =
                value as DocumentTemplateSettings['general']['paperSize']
            })
          }
          className="flex gap-4"
        >
          {PAPER_SIZES.map((size) => (
            <div key={size} className="flex items-center gap-2">
              <RadioGroupItem value={size} id={`paper-${size}`} />
              <Label htmlFor={`paper-${size}`}>{PAPER_LABELS[size]}</Label>
            </div>
          ))}
        </RadioGroup>
      </FormRow>
      <FormRow label="Orientation">
        <RadioGroup
          value={general.orientation}
          onValueChange={(value) =>
            patch((draft) => {
              draft.general.orientation =
                value as DocumentTemplateSettings['general']['orientation']
            })
          }
          className="flex gap-4"
        >
          {ORIENTATIONS.map((orientation) => (
            <div key={orientation} className="flex items-center gap-2">
              <RadioGroupItem
                value={orientation}
                id={`orientation-${orientation}`}
              />
              <Label htmlFor={`orientation-${orientation}`}>
                {ORIENTATION_LABELS[orientation]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FormRow>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          id="margin-top"
          label="Margin top (in)"
          value={general.margins.top}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) =>
            patch((draft) => {
              draft.general.margins.top = value
            })
          }
        />
        <NumberField
          id="margin-bottom"
          label="Margin bottom (in)"
          value={general.margins.bottom}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) =>
            patch((draft) => {
              draft.general.margins.bottom = value
            })
          }
        />
        <NumberField
          id="margin-left"
          label="Margin left (in)"
          value={general.margins.left}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) =>
            patch((draft) => {
              draft.general.margins.left = value
            })
          }
        />
        <NumberField
          id="margin-right"
          label="Margin right (in)"
          value={general.margins.right}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) =>
            patch((draft) => {
              draft.general.margins.right = value
            })
          }
        />
      </div>
      <FormRow label="Font">
        <Select
          value={general.fontFamily}
          onValueChange={(value) =>
            patch((draft) => {
              draft.general.fontFamily =
                value as DocumentTemplateSettings['general']['fontFamily']
            })
          }
        >
          <SelectTrigger aria-label="Font">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TEMPLATE_FONTS.map((font) => (
              <SelectItem key={font} value={font}>
                {FONT_LABELS[font]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>
      <NumberField
        id="font-size"
        label="Font size"
        value={general.fontSize}
        min={6}
        max={36}
        onChange={(value) =>
          patch((draft) => {
            draft.general.fontSize = value
          })
        }
      />
      <ColorField
        id="font-color"
        label="Font color"
        value={general.fontColor}
        onChange={(value) =>
          patch((draft) => {
            draft.general.fontColor = value
          })
        }
        onInvalid={onInvalid}
      />
      <ColorField
        id="label-color"
        label="Label color"
        value={general.labelColor}
        onChange={(value) =>
          patch((draft) => {
            draft.general.labelColor = value
          })
        }
        onInvalid={onInvalid}
      />
      <ColorField
        id="background-color"
        label="Background color"
        value={general.backgroundColor}
        onChange={(value) =>
          patch((draft) => {
            draft.general.backgroundColor = value
          })
        }
        onInvalid={onInvalid}
      />
      <UploadComingSoon id="background-image" label="Background image" />
      <FormRow label="Background position">
        <Select
          value={general.backgroundImagePosition}
          onValueChange={(value) =>
            patch((draft) => {
              draft.general.backgroundImagePosition =
                value as DocumentTemplateSettings['general']['backgroundImagePosition']
            })
          }
        >
          <SelectTrigger aria-label="Background position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_POSITIONS.map((position) => (
              <SelectItem key={position} value={position}>
                {IMAGE_POSITION_LABELS[position]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>
      {documentType === 'invoice' ? (
        <ToggleRow
          id="include-payment-stub"
          label="Include payment stub"
          checked={general.includePaymentStub}
          onChange={(checked) =>
            patch((draft) => {
              draft.general.includePaymentStub = checked
            })
          }
        />
      ) : null}
    </div>
  )
}
