'use client'

import {
  ColorField,
  ContentField,
  NullableColorField,
  NumberField,
  ToggleRow,
  UploadComingSoon,
} from './fields'
import type { TemplateTabProps } from './types'

export function HeaderFooterTab({
  settings,
  patch,
  onInvalid,
}: TemplateTabProps) {
  return (
    <div className="space-y-6">
      <section aria-label="Header" className="space-y-4">
        <h3 className="text-sm font-semibold">Header</h3>
        <ToggleRow
          id="header-show"
          label="Show header"
          checked={settings.header.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.header.show = checked
            })
          }
        />
        <ContentField
          id="header-content"
          label="Header content"
          value={settings.header.content}
          onChange={(value) =>
            patch((draft) => {
              draft.header.content = value
            })
          }
        />
        <NumberField
          id="header-font-size"
          label="Header font size"
          value={settings.header.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.header.fontSize = value
            })
          }
        />
        <ColorField
          id="header-font-color"
          label="Header font color"
          value={settings.header.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.header.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="header-background-color"
          label="Header background"
          value={settings.header.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.header.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <UploadComingSoon
          id="header-background-image"
          label="Header background image"
        />
        <ToggleRow
          id="header-first-page-only"
          label="First page only"
          checked={settings.header.firstPageOnly}
          onChange={(checked) =>
            patch((draft) => {
              draft.header.firstPageOnly = checked
            })
          }
        />
      </section>
      <section aria-label="Footer" className="space-y-4">
        <h3 className="text-sm font-semibold">Footer</h3>
        <ToggleRow
          id="footer-show"
          label="Show footer"
          checked={settings.footer.show}
          onChange={(checked) =>
            patch((draft) => {
              draft.footer.show = checked
            })
          }
        />
        <ContentField
          id="footer-content"
          label="Footer content"
          value={settings.footer.content}
          onChange={(value) =>
            patch((draft) => {
              draft.footer.content = value
            })
          }
        />
        <NumberField
          id="footer-font-size"
          label="Footer font size"
          value={settings.footer.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.footer.fontSize = value
            })
          }
        />
        <ColorField
          id="footer-font-color"
          label="Footer font color"
          value={settings.footer.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.footer.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="footer-background-color"
          label="Footer background"
          value={settings.footer.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.footer.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <UploadComingSoon
          id="footer-background-image"
          label="Footer background image"
        />
        <ToggleRow
          id="footer-show-page-number"
          label="Show page number"
          checked={settings.footer.showPageNumber}
          onChange={(checked) =>
            patch((draft) => {
              draft.footer.showPageNumber = checked
            })
          }
        />
      </section>
    </div>
  )
}
