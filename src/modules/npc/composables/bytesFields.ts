/**
 * `creature_addon`/`creature_template_addon`'s `bytes1`/`bytes2` each pack four
 * byte-sized sub-fields into one `uint32`, mirroring the client's
 * UNIT_FIELD_BYTES_1/UNIT_FIELD_BYTES_2 update fields (byte 0 = least
 * significant). Used to expose them as separate Select/BitmaskField controls
 * without storing anything but the two raw DB columns.
 */
export function getByte(packed: number, index: 0 | 1 | 2 | 3): number {
  return (packed >>> (index * 8)) & 0xFF
}

export function setByte(packed: number, index: 0 | 1 | 2 | 3, value: number): number {
  const mask = 0xFF << (index * 8)
  return (packed & ~mask) | ((value & 0xFF) << (index * 8))
}
