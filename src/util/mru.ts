/**
 * Copyright (c) 2020-present Beng Tan
 */

import { dirname } from './util'

const MRU = 'mru'
const DIR = 'mruDir'
const SIZE = 10

export function mruList(): string[] {
    try {
        const list = JSON.parse(localStorage.getItem(MRU) || '[]')
        if (Array.isArray(list)) {
            return list
        }
    } catch (e) {
    }

    return []
}

export function mruInsert(filename: string) {
    const list = mruList().filter(item => {
        return item != filename
    })
    list.unshift(filename)
    localStorage.setItem(MRU, JSON.stringify(list.slice(0, SIZE)))
    localStorage.setItem(DIR, dirname(filename))
}

export function mruClear() {
    localStorage.removeItem(MRU)
}

export function mruDir() {
    return localStorage.getItem(DIR) || undefined
}
