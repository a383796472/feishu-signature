<template>
  <div class="step-indicator">
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      class="step-item"
      :class="{
        active: step.id === currentStep,
        completed: step.id < currentStep,
      }"
    >
      <!-- 连接线（第一个不显示） -->
      <div
        v-if="index > 0"
        class="step-line"
        :class="{ 'line-completed': step.id <= currentStep }"
      ></div>

      <!-- 圆圈 -->
      <div class="step-circle">
        <!-- 已完成：绿色勾 -->
        <svg
          v-if="step.id < currentStep"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          class="check-icon"
        >
          <path
            d="M5 12.5L10 17L19 7"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 当前/未开始：数字 -->
        <span v-else class="step-number">{{ step.id }}</span>
      </div>

      <!-- 步骤名称 -->
      <span class="step-label">{{ step.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Step {
  id: number
  label: string
}

defineProps<{
  /** 当前步骤，1 / 2 / 3 */
  currentStep: number
}>()

const steps: Step[] = [
  { id: 1, label: '选择数据' },
  { id: 2, label: '设置确认单' },
  { id: 3, label: '创建完成' },
]
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 14px 16px 0;
  padding: 16px 18px 14px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(31, 35, 41, 0.03),
    0 12px 26px -22px rgba(31, 35, 41, 0.4);
}

.step-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

/* 连接线 */
.step-line {
  position: absolute;
  top: 13px;
  left: -50%;
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: #e9ebf0;
  transition: background 0.3s;
  z-index: 0;
}

.step-line.line-completed {
  background: linear-gradient(90deg, #a9c0ff, #1dc981);
}

/* 圆圈 */
.step-circle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f2f3f5;
  color: #8f959e;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  flex-shrink: 0;
  border: 1px solid #e9ebf0;
}

/* 当前步骤：蓝色高亮 */
.step-item.active .step-circle {
  background: linear-gradient(135deg, #5590ff, #3370ff);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(51, 112, 255, 0.12),
    0 4px 10px -4px rgba(51, 112, 255, 0.8);
}

/* 已完成步骤：绿色 */
.step-item.completed .step-circle {
  background: linear-gradient(135deg, #34d99a, #1dc981);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 10px -4px rgba(29, 201, 129, 0.8);
}

.step-number {
  line-height: 1;
}

.check-icon {
  display: block;
}

/* 步骤名称 */
.step-label {
  font-size: 13px;
  color: #8f959e;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.3s;
}

.step-item.active .step-label {
  color: #3370ff;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #0fa968;
}
</style>
