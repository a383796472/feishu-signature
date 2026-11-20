import { bitable } from "@lark-opdev/block-bitable-api";
import type { ITable, ISelection, IFieldMeta, IRecord } from '../types/bitable'

export function isBitableAvailable(): boolean {
  return true
}

export async function getSelection(): Promise<ISelection> {
  const sel = await bitable.base.getSelection()
  return {
    baseId: sel.baseId || '',
    tableId: sel.tableId || '',
    viewId: sel.viewId || '',
    fieldId: sel.fieldId || '',
    recordId: sel.recordId || '',
  }
}

export async function getTableMetaList(): Promise<{ tableId: string; name: string }[]> {
  const list = await bitable.base.getTableMetaList()
  return list.map(t => ({ tableId: t.id, name: t.name }))
}

export async function getTableList(): Promise<ITable[]> {
  const tables = await bitable.base.getTableList()
  return tables.map(t => ({
    tableId: t.id,
    name: '',
    async getFieldMetaList() {
      const list = await t.getFieldMetaList()
      return list.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as number,
        property: {},
      }))
    },
    async getRecordIdList() {
      return await t.getRecordIdList()
    },
    async getRecords(params?: { pageSize?: number }) {
      const res = await t.getRecords({ pageSize: params?.pageSize ?? 500 })
      return res.records.map(r => ({ recordId: r.recordId, fields: r.fields as Record<string, unknown> }))
    },
    async getRecord(recordId: string) {
      return await t.getRecordById(recordId)
    },
    async addRecord(params: { fields: Record<string, unknown> }) {
      return await t.addRecord(params as any)
    },
    async setRecord(recordId: string, params: { fields: Record<string, unknown> }) {
      return await t.setCellValue as any
    },
    async getFieldByName(name: string) {
      return await t.getFieldByName(name)
    },
  } as ITable))
}

export async function getCurrentTable(): Promise<ITable> {
  const selection = await getSelection()
  const tables = await getTableList()
  const table = tables.find((t) => t.tableId === selection.tableId)
  if (!table) {
    throw new Error(`未找到数据表: ${selection.tableId}`)
  }
  return table
}

export async function getFieldMetaList(): Promise<IFieldMeta[]> {
  const table = await getCurrentTable()
  return await table.getFieldMetaList()
}

export async function getRecordIdList(): Promise<string[]> {
  const table = await getCurrentTable()
  return await table.getRecordIdList()
}

export async function getRecord(recordId: string): Promise<IRecord> {
  const table = await getCurrentTable()
  return await table.getRecord(recordId)
}

export async function checkEditable(): Promise<boolean> {
  return await bitable.base.isEditable()
}
