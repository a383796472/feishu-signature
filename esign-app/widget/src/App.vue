<template>
  <div class="widget-app">
    <!-- ========== 顶部标题栏 ========== -->
    <header class="app-header">
      <div class="header-left">
        <div class="brand-mark">
          <svg viewBox="0 0 24 24" width="19" height="19">
            <path
              d="M4 16.8c2.6 0 4.1-1 5.3-2.7 1-1.4 1.6-3.2 2.6-4.4.9-1.1 1.9-1.6 2.7-1 1 .7.4 2.2-.7 3.3-1.6 1.6-3.6 2.6-5.3 4.2"
              fill="none"
              stroke="#fff"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M14.6 15.6h5.2" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </div>
        <div class="header-titles">
          <h1 class="app-title">签字确认</h1>
          <p class="app-subtitle">对多维表中数据进行签字确认</p>
        </div>
      </div>
      <div class="header-right">
        <span
          class="status-badge"
          :class="`status-${connectionStatus}`"
        >
          <span class="status-dot"></span>
          {{ statusText }}
        </span>
        <button class="close-btn" @click="handleClose" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="#8f959e"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- ========== 步骤指示器 ========== -->
    <StepIndicator :current-step="currentStep" />

    <!-- ========== 主内容区域 ========== -->
    <main class="app-content">
      <!-- 加载中 -->
      <div v-if="initializing" class="state-page">
        <div class="spinner"></div>
        <p class="state-text">正在连接多维表格...</p>
      </div>

      <!-- Step 1: 字段选择 -->
      <FieldSelector
        v-else-if="currentStep === 1"
        v-model="selectedFieldIds"
        v-model:fields="fields"
        v-model:table-id="currentTableId"
        v-model:hide-empty="hideEmpty"
        v-model:hide-zero="hideZero"
        :tables="tables"
        @update:table-id="onTableChange"
      />

      <!-- Step 2: 确认单配置 -->
      <FormConfig
        v-else-if="currentStep === 2"
        v-model:form-name="formName"
        v-model:sign-mode="signMode"
        v-model:verify-identity="verifyIdentity"
        v-model:phone-field="phoneField"
        v-model:selected-record-id="selectedRecordId"
        :available-fields="availableFieldsForConfig"
        :record-options="recordOptions"
      />

      <!-- Step 3: 二维码结果 -->
      <QrResult
        v-else-if="currentStep === 3"
        :qr-code-url="qrCodeUrl"
        :share-url="shareUrl"
        :form-name="displayFormName"
        @copy-link="onCopyLink"
        @download-qr="onDownloadQr"
      />
    </main>

    <!-- ========== 底部按钮栏 ========== -->
    <footer class="app-footer">
      <!-- Step 1 -->
      <template v-if="currentStep === 1">
        <button class="btn btn-secondary" @click="handlePreview">
          在线预览
        </button>
        <button
          class="btn btn-primary"
          :disabled="selectedFieldIds.length === 0"
          @click="goNext"
        >
          下一步
        </button>
      </template>

      <!-- Step 2 -->
      <template v-else-if="currentStep === 2">
        <button class="btn btn-secondary" @click="goPrev">
          上一步
        </button>
        <button
          class="btn btn-primary"
          :disabled="creating"
          @click="handleCreate"
        >
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </template>

      <!-- Step 3 -->
      <template v-else-if="currentStep === 3">
        <button class="btn btn-secondary" @click="handleRestart">
          重新创建
        </button>
        <button class="btn btn-primary" @click="handleClose">
          完成
        </button>
      </template>
    </footer>

    <!-- ========== Toast 提示 ========== -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StepIndicator from './components/StepIndicator.vue'
import FieldSelector from './components/FieldSelector.vue'
import FormConfig from './components/FormConfig.vue'
import QrResult from './components/QrResult.vue'
import type { IFieldMeta, ITable } from './types/bitable'
import {
  isBitableAvailable,
  getSelection,
  getTableList,
  getTableMetaList,
  getFieldMetaList,
  checkEditable,
} from './api/bitable'
import { createSession } from './api/server'
import type { Signer, SignMode, FieldConfig } from '@shared/types'

// ========== 步骤控制 ==========
const currentStep = ref(1)
const initializing = ref(true)
const creating = ref(false)

// ========== 连接状态 ==========
const connectionStatus = ref<'connected' | 'readonly' | 'disconnected'>(
  'disconnected'
)
const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接'
    case 'readonly':
      return '只读'
    default:
      return '未连接'
  }
})

// ========== Bitable 数据 ==========
const tables = ref<{ tableId: string; name: string }[]>([])
const currentTableId = ref('')
const appToken = ref('')  // Bitable 应用的 appToken (即 baseId)
const fields = ref<IFieldMeta[]>([])
/** 表格记录（单人模式选签字人；会签模式即签字人列表） */
const recordOptions = ref<{ recordId: string; label: string; phone: string }[]>([])
/** 当前选中的记录（单人签字目标） */
const selectedRecordId = ref('')
const recordIds = computed(() =>
  selectedRecordId.value ? [selectedRecordId.value] : []
)

// ========== Step 1 状态 ==========
const selectedFieldIds = ref<string[]>([])
const hideEmpty = ref(false)
const hideZero = ref(false)

// ========== Step 2 状态 ==========
const formName = ref('')
const signMode = ref<SignMode>('single')
const verifyIdentity = ref(true)
const phoneField = ref('')
const statusField = ref('签字状态')
const signatureField = ref('签名图片')

// ========== Step 3 状态 ==========
const qrCodeUrl = ref('')
const shareUrl = ref('')

// ========== 显示用计算属性 ==========
const displayFormName = computed(
  () => formName.value || defaultFormName.value
)

/** 会签签字人：直接取表格中的记录，无需手动录入 */
const tableSigners = computed<Signer[]>(() =>
  recordOptions.value.map((o) => ({
    id: `record_${o.recordId}`,
    name: o.label,
    phone: o.phone,
  }))
)

/** 传递给 FormConfig 的可选字段列表 */
const availableFieldsForConfig = computed<FieldConfig[]>(() =>
  fields.value
    .filter((f) => selectedFieldIds.value.includes(f.id))
    .map((f, index) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      selected: true,
      order: index,
    }))
)

const defaultFormName = computed(() => {
  const tableName =
    tables.value.find((t) => t.tableId === currentTableId.value)?.name || ''
  return tableName ? `${tableName}签字确认单` : '签字确认单'
})

// ========== Toast ==========
const toastVisible = ref(false)
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string): void {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2500)
}

// ========== 初始化 ==========
async function initBitable(): Promise<void> {
  initializing.value = true

  if (!isBitableAvailable()) {
    initMockData()
    connectionStatus.value = 'disconnected'
    initializing.value = false
    return
  }

  try {
    const editable = await checkEditable()
    connectionStatus.value = editable ? 'connected' : 'readonly'

    const tableMetaList = await getTableMetaList()
    tables.value = tableMetaList

    const selection = await getSelection()
    currentTableId.value = selection.tableId
    appToken.value = selection.baseId  // baseId 即 appToken, 用于后端回写飞书表格

    const fieldMetaList = await getFieldMetaList()
    fields.value = fieldMetaList

    // 加载记录，供单人模式选择签字人；默认选中表格里当前选中的那一行
    await loadRecordOptions(selection.recordId)

    // 默认选中所有字段
    selectedFieldIds.value = fieldMetaList.map((f) => f.id)
  } catch (e) {
    showToast(e instanceof Error ? e.message : '初始化失败，使用模拟数据')
    initMockData()
    connectionStatus.value = 'disconnected'
  } finally {
    initializing.value = false
  }
}

/** 开发模式模拟数据 */
function initMockData(): void {
  tables.value = [
    { tableId: 'tbl_mock1', name: '销售订单' },
    { tableId: 'tbl_mock2', name: '客户信息' },
    { tableId: 'tbl_mock3', name: '合同台账' },
  ]
  currentTableId.value = 'tbl_mock1'
  loadMockFields('tbl_mock1')
  recordOptions.value = [
    { recordId: 'rec_001', label: '张三', phone: '13222222222' },
    { recordId: 'rec_002', label: '李四', phone: '13233333333' },
    { recordId: 'rec_003', label: '王五', phone: '13244444444' },
  ]
  selectedRecordId.value = 'rec_001'
}

/** 根据数据表 ID 加载模拟字段 */
function loadMockFields(tableId: string): void {
  const mockFieldsMap: Record<string, IFieldMeta[]> = {
    tbl_mock1: [
      { id: 'fld1', name: '订单编号', type: 1, property: {} },
      { id: 'fld2', name: '客户名称', type: 1, property: {} },
      { id: 'fld3', name: '订单金额', type: 2, property: {} },
      { id: 'fld4', name: '下单日期', type: 5, property: {} },
      { id: 'fld5', name: '是否付款', type: 7, property: {} },
      { id: 'fld6', name: '销售负责人', type: 11, property: {} },
    ],
    tbl_mock2: [
      { id: 'fld_a', name: '客户名称', type: 1, property: {} },
      { id: 'fld_b', name: '联系电话', type: 13, property: {} },
      { id: 'fld_c', name: '客户等级', type: 3, property: {} },
      { id: 'fld_d', name: '合同金额', type: 100002, property: {} },
    ],
    tbl_mock3: [
      { id: 'fld_x', name: '合同编号', type: 1, property: {} },
      { id: 'fld_y', name: '签约方', type: 1, property: {} },
      { id: 'fld_z', name: '合同状态', type: 3, property: {} },
      { id: 'fld_w', name: '附件', type: 17, property: {} },
    ],
  }
  fields.value = mockFieldsMap[tableId] || mockFieldsMap['tbl_mock1']
  selectedFieldIds.value = fields.value.map((f) => f.id)
}

// ========== 数据表切换 ==========
async function onTableChange(tableId: string): Promise<void> {
  currentTableId.value = tableId

  if (!isBitableAvailable()) {
    loadMockFields(tableId)
    return
  }

  try {
    const tableList = await getTableList()
    const table = tableList.find((t) => t.tableId === tableId)
    if (table) {
      await loadTableData(table)
    }
  } catch {
    showToast('切换数据表失败')
  }
}

/** 从 ITable 实例加载字段和记录 */
async function loadTableData(table: ITable): Promise<void> {
  const fieldMetaList = await table.getFieldMetaList()
  fields.value = fieldMetaList
  selectedFieldIds.value = fieldMetaList.map((f) => f.id)
  // 切换数据表后重新读取记录，默认仍选中表格中当前行
  const selection = await getSelection()
  await loadRecordOptions(selection.recordId)
}

/** 单元格值转纯文本 */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(cellToText).join('')
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text
    if (typeof obj.name === 'string') return obj.name
    if (typeof obj.link === 'string') return obj.link
  }
  return ''
}

/** 读取表格记录，生成「姓名 · 手机号」形式的可选项 */
async function loadRecordOptions(preselectId: string): Promise<void> {
  try {
    const tableList = await getTableList()
    const table = tableList.find((t) => t.tableId === currentTableId.value)
    if (!table) {
      recordOptions.value = []
      selectedRecordId.value = ''
      return
    }
    const records = await table.getRecords({ pageSize: 500 })
    const nameField = fields.value.find((f) => /姓名|名字|名称|联系人/.test(f.name))
    const phoneMeta = fields.value.find((f) => /手机|电话/.test(f.name))

    recordOptions.value = records
      .map((r, index) => {
        const name = nameField ? cellToText(r.fields[nameField.id]) : ''
        const phone = phoneMeta ? cellToText(r.fields[phoneMeta.id]) : ''
        // 跳过完全空白的行
        if (!name && !phone) return null
        return {
          recordId: r.recordId,
          label: name || phone || `记录 ${index + 1}`,
          phone,
        }
      })
      .filter(
        (item): item is { recordId: string; label: string; phone: string } =>
          item !== null
      )

    const exists = recordOptions.value.some((o) => o.recordId === preselectId)
    selectedRecordId.value = exists
      ? preselectId
      : recordOptions.value[0]?.recordId || ''
  } catch {
    recordOptions.value = []
    selectedRecordId.value = ''
  }
}

// ========== 步骤导航 ==========
function goNext(): void {
  if (currentStep.value === 1) {
    if (selectedFieldIds.value.length === 0) {
      showToast('请至少选择一个字段')
      return
    }
    currentStep.value = 2
  }
}

function goPrev(): void {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// ========== 创建确认单 ==========
async function handleCreate(): Promise<void> {
  if (creating.value) return

  // 确认单名称必填
  if (!formName.value.trim()) {
    showToast('请输入确认单名称')
    return
  }

  // 单人模式必须指定签字人（哪一行记录）
  if (signMode.value === 'single' && !selectedRecordId.value) {
    showToast('请选择要签字的记录')
    return
  }

  // 会签模式：签字人直接来自表格记录
  if (signMode.value === 'multi') {
    if (recordOptions.value.length === 0) {
      showToast('未读取到表格记录，请确认数据表中已有数据')
      return
    }
    if (verifyIdentity.value && recordOptions.value.some((o) => !o.phone)) {
      showToast('表格中存在未填写手机号的记录，请补充后再创建')
      return
    }
  }

  // 身份验证模式下校验验证字段
  if (verifyIdentity.value && !phoneField.value) {
    showToast('请选择验证字段用于身份验证')
    return
  }

  creating.value = true

  // 开发模式：模拟创建结果
  if (!isBitableAvailable()) {
    setTimeout(() => {
      mockCreateResult()
      creating.value = false
    }, 800)
    return
  }

  try {
    const tableName =
      tables.value.find((t) => t.tableId === currentTableId.value)?.name || ''

    const selectedFields: FieldConfig[] = fields.value
      .filter((f) => selectedFieldIds.value.includes(f.id))
      .map((f, index) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        selected: true,
        order: index,
      }))

    const response = await createSession({
      appToken: appToken.value,
      tableId: currentTableId.value,
      tableName,
      fields: selectedFields,
      formName: formName.value.trim(),
      signMode: signMode.value,
      verifyIdentity: verifyIdentity.value,
      signers:
        signMode.value === 'multi'
          ? tableSigners.value
          : (() => {
              // 单人签字：把选中的签字人姓名带入会话，供 H5 验证页展示
              const selected = recordOptions.value.find(
                (o) => o.recordId === selectedRecordId.value
              )
              return selected
                ? [{ id: `record_${selected.recordId}`, name: selected.label, phone: selected.phone }]
                : []
            })(),
      recordIds: recordIds.value,
      phoneField: phoneField.value || undefined,
      writebackConfig: {
        statusField: statusField.value || '签字状态',
        signatureField: signatureField.value || '签名图片',
      },
    })

    qrCodeUrl.value = response.qrCodeUrl
    shareUrl.value = response.shareUrl
    currentStep.value = 3
  } catch (e) {
    showToast(e instanceof Error ? e.message : '创建失败，请重试')
  } finally {
    creating.value = false
  }
}

/** 模拟创建结果（开发模式） */
function mockCreateResult(): void {
  qrCodeUrl.value = generateMockQrCode()
  const mockSessionId = `mock_${Date.now()}`
  shareUrl.value = `${window.location.origin.replace(
    /:\d+$/,
    ':5174'
  )}/?sessionId=${mockSessionId}&recordId=rec_001`
  currentStep.value = 3
  showToast('（模拟环境）确认单已创建')
}

/** 生成模拟二维码 SVG */
function generateMockQrCode(): string {
  const size = 25
  const cell = 8
  const total = size * cell
  let rects = ''

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isCorner =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7)

      if (isCorner) {
        const cx = x < 7 ? x : x - (size - 7)
        const cy = y < 7 ? y : y - (size - 7)
        const isBorder = cx === 0 || cx === 6 || cy === 0 || cy === 6
        const isInner = cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4
        if (isBorder || isInner) {
          rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#1f2329"/>`
        }
      } else {
        if ((x * 7 + y * 13 + x * y * 3) % 3 === 0) {
          rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#1f2329"/>`
        }
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/>${rects}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ========== 在线预览 ==========
function handlePreview(): void {
  if (selectedFieldIds.value.length === 0) {
    showToast('请先选择至少一个字段')
    return
  }
  showToast('预览功能：将打开签字确认 H5 页面预览效果')
}

// ========== 重新创建 ==========
function handleRestart(): void {
  currentStep.value = 1
  qrCodeUrl.value = ''
  shareUrl.value = ''
}

// ========== QrResult 事件 ==========
function onCopyLink(url: string): void {
  if (url) {
    showToast('链接已复制到剪贴板')
  }
}

function onDownloadQr(_url: string): void {
  showToast('二维码已开始下载')
}

// ========== 关闭 ==========
function handleClose(): void {
  if (isBitableAvailable()) {
    // 在飞书环境中，尝试关闭 Widget
    // bitable SDK 可能提供关闭方法，此处降级处理
    showToast('请通过多维表格关闭此插件')
  } else {
    window.close()
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  initBitable()
})
</script>

<style scoped>
.widget-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f4f6fa;
  background-image: radial-gradient(
    560px 260px at 50% -120px,
    rgba(51, 112, 255, 0.12),
    transparent 70%
  );
}

/* ========== 顶部标题栏 ========== */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #eceef2;
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 1;
  min-width: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #6f9bff, #3370ff 55%, #2b62e8);
  box-shadow: 0 6px 14px -6px rgba(51, 112, 255, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2329;
  line-height: 1.3;
  letter-spacing: 0.3px;
}

.app-subtitle {
  font-size: 12px;
  color: #8f959e;
  line-height: 1.4;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 连接状态徽标 */
.status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-connected {
  background: rgba(29, 201, 129, 0.1);
  border-color: rgba(29, 201, 129, 0.22);
  color: #0fa968;
}

.status-connected .status-dot {
  background: #1dc981;
  box-shadow: 0 0 0 3px rgba(29, 201, 129, 0.16);
}

.status-readonly {
  background: rgba(255, 159, 22, 0.1);
  border-color: rgba(255, 159, 22, 0.24);
  color: #d97e00;
}

.status-readonly .status-dot {
  background: #ff9f16;
  box-shadow: 0 0 0 3px rgba(255, 159, 22, 0.16);
}

.status-disconnected {
  background: #f2f3f5;
  border-color: #e5e6eb;
  color: #8f959e;
}

.status-disconnected .status-dot {
  background: #c9cdd4;
}

/* 关闭按钮 */
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  transition: background 0.2s, transform 0.15s;
}

.close-btn:hover {
  background: #f2f3f5;
}

.close-btn:active {
  transform: scale(0.92);
}

/* ========== 主内容区域 ========== */
.app-content {
  flex: 1;
  padding: 12px 16px 16px;
  overflow-y: auto;
}

/* 加载状态 */
.state-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e5e9f2;
  border-top-color: #3370ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-text {
  margin-top: 16px;
  font-size: 14px;
  color: #8f959e;
}

/* ========== 底部按钮栏 ========== */
.app-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.94);
  border-top: 1px solid #eceef2;
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  box-shadow: 0 -8px 24px -18px rgba(31, 35, 41, 0.5);
}

.btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:active:not(:disabled) {
  transform: scale(0.985);
}

.btn-secondary {
  background: #f2f3f5;
  color: #4e5969;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ebf0;
}

.btn-secondary:active:not(:disabled) {
  background: #e3e4e8;
}

.btn-primary {
  background: linear-gradient(135deg, #5590ff, #3370ff 55%, #2b62e8);
  color: #fff;
  box-shadow: 0 8px 18px -10px rgba(51, 112, 255, 0.95);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 10px 22px -10px rgba(51, 112, 255, 0.9);
  filter: brightness(1.03);
}

.btn-primary:active:not(:disabled) {
  background: #245bdb;
}

.btn-primary:disabled {
  background: #e3e6eb;
  color: #b8bcc4;
  box-shadow: none;
  cursor: not-allowed;
}

/* ========== Toast ========== */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(31, 35, 41, 0.92);
  color: #fff;
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  z-index: 10000;
  max-width: 80%;
  text-align: center;
  box-shadow: 0 16px 36px -12px rgba(31, 35, 41, 0.6);
  backdrop-filter: blur(6px);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
