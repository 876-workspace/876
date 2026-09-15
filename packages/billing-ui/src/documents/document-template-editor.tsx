'use client'

// This editor is only ever rendered by client host adapters, so the onSubmit
// callback prop never crosses a React Server Component boundary.

import { useCallback, useMemo, useState, type FormEvent } from 'react'
import type { Branding } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import {
  DOCUMENT_TEMPLATE_LAYOUTS,
  layoutDefaults,
  resolveDocumentTemplate,
} from '@876/core/document-templates'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import { sampleDocumentFor } from './sample-document'
import { diffTemplateSettings } from './template-diff'
import { DetailsTab } from './template-editor/details-tab'
import { AccentField } from './template-editor/fields'
import { GeneralTab } from './template-editor/general-tab'
import { HeaderFooterTab } from './template-editor/header-footer-tab'
import { OtherTab } from './template-editor/other-tab'
import { TableTab } from './template-editor/table-tab'
import { TotalsTab } from './template-editor/totals-tab'
import { TemplatedDocument } from './templated-document'
import type { TemplatedDocumentData } from './types'

export interface DocumentTemplateEditorInitial {
  name: string
  layout: DocumentTemplateLayoutKey
  settings: DocumentTemplateOverrides
}

export interface DocumentTemplateEditorSubmit {
  name: string
  layout: DocumentTemplateLayoutKey
  settings: DocumentTemplateOverrides
}

export interface DocumentTemplateEditorProps {
  documentType: DocumentTemplateType
  initial: DocumentTemplateEditorInitial
  branding: Branding
  seller?: TemplatedDocumentData['seller']
  /** Defaults to 'Save'. */
  submitLabel?: string
  onSubmit: (
    value: DocumentTemplateEditorSubmit
  ) => Promise<{ error: { message: string } | null }>
  cancelHref: string
}

export function DocumentTemplateEditor({
  documentType,
  initial,
  branding,
  seller,
  submitLabel = 'Save',
  onSubmit,
  cancelHref,
}: DocumentTemplateEditorProps) {
  const [name, setName] = useState(initial.name)
  const [layout, setLayout] = useState(initial.layout)
  const [settings, setSettings] = useState<DocumentTemplateSettings>(() =>
    resolveDocumentTemplate(initial.layout, documentType, initial.settings)
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hexErrors, setHexErrors] = useState<Record<string, string>>({})

  const reportHexInvalid = useCallback(
    (fieldId: string, message: string | null) => {
      setHexErrors((prev) => {
        if (message === null) {
          if (!(fieldId in prev)) return prev
          const next = { ...prev }
          delete next[fieldId]
          return next
        }
        return prev[fieldId] === message
          ? prev
          : { ...prev, [fieldId]: message }
      })
    },
    []
  )

  const hasHexErrors = Object.keys(hexErrors).length > 0

  function patch(mutator: (draft: DocumentTemplateSettings) => void) {
    setSettings((prev) => {
      const next = structuredClone(prev)
      mutator(next)
      return next
    })
  }

  function handleLayoutChange(next: DocumentTemplateLayoutKey) {
    if (next === layout) return
    setLayout(next)
    setSettings((prev) => {
      // Re-base on the new layout's defaults, carrying the user's changed
      // fields across; values the new layout rejects fall back to its default.
      const carried = diffTemplateSettings(
        layoutDefaults(layout, documentType),
        prev
      )
      return resolveDocumentTemplate(next, documentType, carried)
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending || hasHexErrors) return
    setPending(true)
    setError(null)
    try {
      const result = await onSubmit({
        name,
        layout,
        settings: diffTemplateSettings(
          layoutDefaults(layout, documentType),
          settings
        ),
      })
      if (result.error) setError(result.error.message)
    } catch {
      setError('Could not save the template. Try again.')
    } finally {
      setPending(false)
    }
  }

  const previewDocument = useMemo(
    () => sampleDocumentFor(documentType, seller),
    [documentType, seller]
  )

  const supportedLayouts = DOCUMENT_TEMPLATE_LAYOUTS.filter((entry) =>
    entry.documentTypes.includes(documentType)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <FormRow htmlFor="template-name" label="Template name">
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </FormRow>
        <FormRow label="Layout">
          <Select
            value={layout}
            onValueChange={(value) =>
              handleLayoutChange(value as DocumentTemplateLayoutKey)
            }
          >
            <SelectTrigger aria-label="Layout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedLayouts.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <AccentField
          value={settings.general.accentColor}
          branding={branding}
          onChange={(accentColor) =>
            patch((draft) => {
              draft.general.accentColor = accentColor
            })
          }
          onInvalid={reportHexInvalid}
        />
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="info"
            disabled={pending || hasHexErrors}
          >
            {submitLabel}
          </Button>
          <a
            href={cancelHref}
            className="text-muted-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            Cancel
          </a>
        </div>
      </div>
      {error ? (
        <AppError
          variant="form"
          title="Could not save the template"
          error={{ code: 'template_save_failed', message: error }}
        />
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="header-footer">Header & Footer</TabsTrigger>
            <TabsTrigger value="details">Transaction Details</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="totals">Total</TabsTrigger>
            <TabsTrigger value="other">Other Details</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <GeneralTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
              documentType={documentType}
            />
          </TabsContent>
          <TabsContent value="header-footer">
            <HeaderFooterTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
            />
          </TabsContent>
          <TabsContent value="details">
            <DetailsTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
            />
          </TabsContent>
          <TabsContent value="table">
            <TableTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
            />
          </TabsContent>
          <TabsContent value="totals">
            <TotalsTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
            />
          </TabsContent>
          <TabsContent value="other">
            <OtherTab
              settings={settings}
              patch={patch}
              onInvalid={reportHexInvalid}
            />
          </TabsContent>
        </Tabs>
        <div
          aria-label="Template preview"
          className="overflow-x-auto rounded-md border p-4"
        >
          <TemplatedDocument
            documentType={documentType}
            layout={layout}
            settings={settings}
            branding={branding}
            document={previewDocument}
          />
        </div>
      </div>
    </form>
  )
}
