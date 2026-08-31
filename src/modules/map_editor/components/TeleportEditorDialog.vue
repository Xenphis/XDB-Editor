<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import EditorField from '@core/components/EditorField.vue'
import type { GameTele } from '../types'
import { nextGameTeleId } from '../service'
import { deleteTeleport, saveTeleport } from '../teleports'

/**
 * Create / edit / delete one `game_tele` row — the whole teleport editor,
 * inlined in the map editor now that the standalone module is gone. Opened
 * either from the zone tables panel (existing row) or from a position picked
 * on the map (new row, id auto-assigned).
 */

const props = defineProps<{
  visible: boolean
  /** Row to edit, or the seeded draft to create (id 0 = assign the next one). */
  draft: GameTele | null
  /** Creating: no row exists in the DB yet. */
  isNew: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved', row: GameTele): void
  (e: 'deleted', row: GameTele): void
}>()

const { t } = useI18n()

const form = ref<GameTele | null>(null)
/** The row as loaded, for the diff staged in the SQL session panel. */
const original = ref<GameTele | null>(null)
const saving = ref(false)
const error = ref('')
/** Delete asks for a second click rather than a blocking confirm dialog. */
const confirmingDelete = ref(false)

const title = computed(() =>
  props.isNew ? t('mapEditor.teleports.createTitle') : t('mapEditor.teleports.editTitle'),
)

const canSave = computed(() => !!form.value?.name.trim() && !saving.value)

/** InputNumber hands back null on a cleared field; the columns are NOT NULL. */
function numeric(value: number): number {
  return Number.isFinite(value) ? value : 0
}

// Reset on every open: a stale draft must never leak into the next edit.
watch(
  () => props.visible,
  async visible => {
    if (!visible || !props.draft) return
    form.value = { ...props.draft }
    original.value = props.isNew ? null : { ...props.draft }
    error.value = ''
    saving.value = false
    confirmingDelete.value = false
    if (props.isNew && form.value.id === 0) {
      try {
        const id = await nextGameTeleId()
        // The dialog may have been closed (or reopened) while this resolved.
        if (form.value && form.value.id === 0) form.value.id = id
      } catch (e) {
        error.value = String(e)
      }
    }
  },
  { immediate: true },
)

function close() {
  emit('update:visible', false)
}

async function onSave() {
  if (!form.value || !canSave.value) return
  saving.value = true
  error.value = ''
  try {
    const row: GameTele = {
      id: Math.trunc(numeric(form.value.id)),
      map: Math.trunc(numeric(form.value.map)),
      position_x: numeric(form.value.position_x),
      position_y: numeric(form.value.position_y),
      position_z: numeric(form.value.position_z),
      orientation: numeric(form.value.orientation),
      name: form.value.name.trim(),
    }
    await saveTeleport(row, original.value)
    emit('saved', row)
    close()
  } catch (e) {
    error.value = String(e)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!form.value || props.isNew) return
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  saving.value = true
  error.value = ''
  try {
    const row = original.value ?? form.value
    await deleteTeleport(row)
    emit('deleted', row)
    close()
  } catch (e) {
    error.value = String(e)
    confirmingDelete.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="title"
    modal
    :style="{ width: '34rem' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="form" class="tele-form">
      <div class="tele-grid">
        <EditorField :label="t('mapEditor.teleports.fields.name')" class="tele-span-2">
          <InputText v-model="form.name" autofocus fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.id')">
          <InputNumber v-model="form.id" :useGrouping="false" :min="0" :disabled="!isNew" fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.map')">
          <InputNumber v-model="form.map" :useGrouping="false" :min="0" fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.position_x')">
          <InputNumber v-model="form.position_x" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="4" fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.position_y')">
          <InputNumber v-model="form.position_y" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="4" fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.position_z')">
          <InputNumber v-model="form.position_z" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="4" fluid />
        </EditorField>
        <EditorField :label="t('mapEditor.teleports.fields.orientation')">
          <InputNumber v-model="form.orientation" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="4" fluid />
        </EditorField>
      </div>

      <!-- A 2D pick has no height: say so instead of silently writing Z 0. -->
      <p v-if="isNew && form.position_z === 0" class="tele-hint">
        <i class="pi pi-info-circle"></i>
        {{ t('mapEditor.teleports.heightHint') }}
      </p>

      <p v-if="error" class="tele-error">{{ error }}</p>
    </div>

    <template #footer>
      <Button
        v-if="!isNew"
        :label="confirmingDelete ? t('mapEditor.teleports.confirmDelete') : t('mapEditor.teleports.delete')"
        icon="pi pi-trash"
        severity="danger"
        text
        :disabled="saving"
        class="tele-delete"
        @click="onDelete"
      />
      <Button :label="t('mapEditor.teleports.cancel')" text :disabled="saving" @click="close" />
      <Button
        :label="t('mapEditor.teleports.save')"
        icon="pi pi-check"
        :loading="saving"
        :disabled="!canSave"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.tele-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.tele-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;
}

.tele-span-2 {
  grid-column: span 2;
}

.tele-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.tele-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8rem;
}

/* Delete sits on the left, away from the save/cancel pair. */
.tele-delete {
  margin-right: auto;
}
</style>
