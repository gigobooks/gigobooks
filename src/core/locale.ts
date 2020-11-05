/**
 * Copyright (c) 2020-present Beng Tan
 */

export const LOCALE = typeof navigator === 'undefined' ? [] :
  [...navigator.languages] || navigator.language
export default LOCALE
