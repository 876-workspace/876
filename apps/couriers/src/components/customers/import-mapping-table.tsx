import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  IMPORT_TARGETS,
  type ImportMapping,
  type ImportTargetField,
} from '@/lib/customers/import-mapping'

type Props = {
  headers: string[]
  mapping: ImportMapping
  onChange: (header: string, target: ImportTargetField | null) => void
}

export function ImportMappingTable({ headers, mapping, onChange }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">CSV column</TableHead>
            <TableHead className="pr-5">Customer field</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {headers.map((header) => (
            <TableRow key={header}>
              <TableCell className="pl-5 font-medium">{header}</TableCell>
              <TableCell className="pr-5">
                <NativeSelect
                  className="w-full"
                  value={mapping[header] ?? ''}
                  onChange={(event) =>
                    onChange(
                      header,
                      (event.currentTarget.value as ImportTargetField) || null
                    )
                  }
                  aria-label={`Map ${header}`}
                >
                  <NativeSelectOption value="">Ignore</NativeSelectOption>
                  {IMPORT_TARGETS.map((target) => (
                    <NativeSelectOption key={target.value} value={target.value}>
                      {target.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
