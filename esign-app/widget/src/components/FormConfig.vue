<template>
  <div class="form-config">
    <!-- 确认单名称 -->
    <div class="card">
      <div class="card-title">确认单名称<span class="required-mark">*</span></div>
      <input
        :value="formName"
        type="text"
        class="text-input"
        placeholder="请输入确认单名称"
        maxlength="50"
        @input="emit('update:formName', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 签字模式 -->
    <div class="card">
      <div class="card-title">签字模式</div>
      <div class="mode-buttons">
        <button
          class="mode-btn"
          :class="{ active: signMode === 'single' }"
          @click="emit('update:signMode', 'single')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" class="mode-icon">
            <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>单人签字</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: signMode === 'multi' }"
          @click="emit('update:signMode', 'multi')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" class="mode-icon">
            <circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
            <circle cx="16" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M3 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5M11 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>会签（多人）</span>
        </button>
      </div>
      <p v-if="signMode === 'multi'" class="mode-tip">
        会签模式：所有签字人独立签字，谁签完即回写到表格，无需等待全部签完
      </p>
    </div>

    <!-- 指定签字人（仅单人签字） -->
    <div v-if="signMode === 'single'" class="card">
      <div class="card-title">指定签字人</div>
      <select
        :value="selectedRecordId"
        class="select-input"
        @change="emit('update:selectedRecordId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">请选择签字人</option>
        <option v-for="opt in recordOptions" :key="opt.recordId" :value="opt.recordId">
          {{ opt.label }}
        </option>
      </select>
      <p v-if="recordOptions.length === 0" class="field-hint warn">
        未读取到表格记录，请确认当前数据表中已有数据
      </p>
    </div>

    <!-- 验证身份 -->
    <div class="card">
      <label class="option-item" @click.stop>
        <input
          type="checkbox"
          :checked="verifyIdentity"
          class="checkbox-input"
          disabled
          @change="emit('update:verifyIdentity', ($event.target as HTMLInputElement).checked)"
        />
        <span class="checkbox-box">
          <svg
            v-if="verifyIdentity"
            viewBox="0 0 24 24"
            width="12"
            height="12"
            class="check-svg"
          >
            <path
              d="M5 12.5L10 17L19 7"
              fill="none"
              stroke="#fff"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="option-content">
          <span class="option-label">身份验证（字段匹配，免费）<span class="required-mark">*</span></span>
          <span class="option-desc">签字人填写与表格中选中字段一致的内容后即可签字，无需短信费用</span>
        </span>
      </label>

      <!-- 验证字段选择 -->
      <div v-if="verifyIdentity" class="sub-config">
        <label class="input-label">选择验证字段</label>
        <select
          :value="phoneField"
          class="select-input"
          @change="emit('update:phoneField', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">请选择验证字段</option>
          <option v-for="field in availableFields" :key="field.id" :value="field.name">
            {{ field.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 回写字段配置 -->
    <div class="card">
      <div class="card-title">回写字段配置</div>
      <p class="callout">
        请务必先在多维表格中新建两个字段：文本「<strong>签字状态</strong>」、附件「<strong>签名图片</strong>」；缺少任一字段，签字结果将无法回写。
      </p>
    </div>

    <!-- 签字人列表（多人模式，自动读取表格） -->
    <div v-if="signMode === 'multi'" class="card">
      <div class="card-title">
        签字人（来自表格）
        <span class="signer-count">（{{ recordOptions.length }}人）</span>
      </div>

      <p v-if="recordOptions.length === 0" class="field-hint warn">
        未读取到表格记录，请确认当前数据表中已有数据
      </p>

      <div v-else class="signer-list">
        <div
          v-for="(opt, index) in recordOptions"
          :key="opt.recordId"
          class="signer-item"
        >
          <div class="signer-index">{{ index + 1 }}</div>
          <div class="signer-readonly-info">
            <span class="signer-name-text">{{ opt.label }}</span>
            <span class="signer-phone-text" :class="{ 'phone-missing': !opt.phone }">
              {{ opt.phone || '未填写手机号' }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="missingPhoneCount > 0" class="field-hint warn">
        有 {{ missingPhoneCount }} 行记录未填写手机号，补齐后才能创建
      </p>
    </div>

    <!-- 单人模式提示 -->
    <div v-else class="card mode-hint-card">
      <svg viewBox="0 0 24 24" width="20" height="20" class="hint-icon">
        <circle cx="12" cy="12" r="9" fill="none" stroke="#3370ff" stroke-width="1.8" />
        <path d="M12 8v4M12 16h.01" stroke="#3370ff" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span class="hint-text">单人签字模式下，所有记录由同一人完成签字确认</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SignMode, FieldConfig } from '@shared/types'

const props = defineProps<{
  /** 确认单名称 */
  formName: string
  /** 签字模式 */
  signMode: SignMode
  /** 是否验证身份 */
  verifyIdentity: boolean
  /** 可选字段列表 (用于手机号字段选择) */
  availableFields: FieldConfig[]
  /** 手机号字段名 */
  phoneField: string
  /** 表格记录：单人模式用于选择签字人，会签模式即签字人列表 */
  recordOptions: { recordId: string; label: string; phone: string }[]
  /** 当前选中的记录 ID */
  selectedRecordId: string
}>()

const emit = defineEmits<{
  (e: 'update:formName', value: string): void
  (e: 'update:signMode', value: SignMode): void
  (e: 'update:verifyIdentity', value: boolean): void
  (e: 'update:phoneField', value: string): void
  (e: 'update:selectedRecordId', value: string): void
}>()

/** 未填写手机号的记录数（会签模式必须有手机号） */
const missingPhoneCount = computed(
  () => props.recordOptions.filter((o) => !o.phone).length
)
</script>

<style scoped>
.form-config {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 16px;
  border: 1px solid #eef0f3;
  box-shadow: 0 1px 2px rgba(31, 35, 41, 0.03),
    0 12px 26px -20px rgba(31, 35, 41, 0.35);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  border-color: #e6eaf2;
  box-shadow: 0 2px 4px rgba(31, 35, 41, 0.03),
    0 16px 30px -20px rgba(31, 35, 41, 0.4);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  letter-spacing: 0.2px;
  margin-bottom: 12px;
}

.card-title::before {
  content: '';
  flex-shrink: 0;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #6f9bff, #3370ff);
}

.signer-count {
  font-size: 13px;
  font-weight: 400;
  color: #8f959e;
}

/* 输入框 */
.text-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #dfe2e8;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2329;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.text-input::placeholder {
  color: #b8bcc4;
}

.text-input:hover {
  border-color: #c6ccd6;
}

.text-input:focus {
  background: #fff;
  border-color: #3370ff;
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.12);
}

/* 下拉选择 */
.select-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background-color: #fff;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2329;
  border: 1px solid #dfe2e8;
  outline: none;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238f959e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-input:hover {
  border-color: #c6ccd6;
}

.select-input:focus {
  border-color: #3370ff;
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.12);
}

/* 签字模式按钮 */
.mode-buttons {
  display: flex;
  gap: 12px;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 16px 8px;
  background: #fff;
  border: 1.5px solid #e5e6eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #4e5969;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: #c9d4ff;
  background: #f8faff;
  color: #3370ff;
}

.mode-btn:active {
  transform: scale(0.98);
}

.mode-btn.active {
  border-color: #3370ff;
  background: linear-gradient(180deg, #f5f8ff, #eaf1ff);
  color: #3370ff;
  box-shadow: 0 4px 12px -6px rgba(51, 112, 255, 0.55);
}

.mode-icon {
  flex-shrink: 0;
}

.mode-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #8f959e;
  line-height: 1.5;
}

/* 复选框选项 */
.option-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid #d0d4dc;
  background: #fff;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 1px;
}

.checkbox-input:checked + .checkbox-box {
  background: linear-gradient(135deg, #4e83fd, #3370ff);
  border-color: #3370ff;
  box-shadow: 0 2px 6px -2px rgba(51, 112, 255, 0.65);
}

.check-svg {
  display: block;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2329;
}

.option-desc {
  font-size: 12px;
  color: #646a73;
  line-height: 1.5;
}

/* 子配置区域 */
.sub-config {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #ebedf2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.callout {
  font-size: 13px;
  color: #1f2329;
  line-height: 1.7;
  padding: 10px 12px;
  background: #f5f8ff;
  border: 1px solid #e5edff;
  border-left: 3px solid #3370ff;
  border-radius: 6px;
}

.callout strong {
  color: #245bdb;
  font-weight: 600;
}

.input-label {
  font-size: 12px;
  font-weight: 500;
  color: #646a73;
}

.field-hint {
  font-size: 12px;
  color: #4e5969;
  line-height: 1.6;
  margin-top: 6px;
  padding: 7px 10px;
  background: #f5f7fa;
  border-left: 3px solid #3370ff;
  border-radius: 0 6px 6px 0;
}

.field-hint.warn {
  color: #d25f00;
  background: #fff7e8;
  border-left-color: #ff7d00;
}

.required-mark {
  color: #f53f3f;
  margin-left: 2px;
}

/* 签字人列表 */
.signer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f9fb;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  transition: border-color 0.2s, background 0.2s;
}

.signer-item:hover {
  background: #fff;
  border-color: #dfe6f5;
}

.signer-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4e83fd, #3370ff);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 6px -2px rgba(51, 112, 255, 0.7);
}

.signer-readonly-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.signer-name-text {
  font-size: 14px;
  font-weight: 500;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signer-phone-text {
  font-size: 13px;
  color: #8f959e;
  flex-shrink: 0;
}

.signer-phone-text.phone-missing {
  color: #d25f00;
}

/* 单人模式提示 */
.mode-hint-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, #f8faff, #f3f7ff);
  border-color: #e5edff;
}

.hint-icon {
  flex-shrink: 0;
}

.hint-text {
  font-size: 13px;
  color: #4e5969;
  line-height: 1.5;
}
</style>
