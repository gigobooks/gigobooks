/**
 * Copyright (c) 2020-present Beng Tan
 */

import { parseISO, addDays, subDays,
    endOfMonth, startOfMonth, addMonths, subMonths,
    endOfQuarter, startOfQuarter, addQuarters, subQuarters,
    addYears, subYears } from 'date-fns'
import { LOCALE } from './locale'
import { Project } from './Project'

let cache: string = ''

// Extract the date format string (of current locale)
export function dateFormatString(): string {
    if (!cache) {
        const formatter = new Intl.DateTimeFormat(LOCALE, {
            year: 'numeric', month: 'numeric', day: 'numeric'
        })

        const parts: string[] = []
        ;(formatter as any).formatToParts(new Date()).map(({type, value}: {type: string, value: string}) => {
            switch (type) {
                case 'day': parts.push('d'); break
                case 'month': parts.push('M'); break
                case 'year': case 'relatedYear': parts.push('yyyy'); break
                case 'literal': parts.push(value); break
            }
        })

        cache = parts.join('')
    }

    return cache
}

// Returns true if the supplied string is an ISO-8601-ish 'date-only' string.
// ie. a ten character string like '2020-01-01'
export function isDateOnly(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// Converts the supplied date into an iSO-8601-ish 'date-only' string according
// to local time
export function toDateOnly(date: Date): string {
    const m = date.getMonth() + 1
    const d = date.getDate()
    return `${date.getFullYear()}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`
}

export function formatDateOnly(s: string) {
    return new Intl.DateTimeFormat(LOCALE, {
        year: 'numeric', month: 'numeric', day: 'numeric'
    }).format(parseISO(s))
}

export type FiscalYearStart = {
    date: number
    month: number       // month starts from 1
}

export function fiscalYearStart() {
    const raw = Project.variables.get('fiscalYear')
    return {
        date: Number(raw.substring(0, 2)),
        month: Number(raw.substring(2, 4)),
    }
}

export function lastSavedDate() {
    const dateOnly = Project.variables.get('lastSavedDate')
    return dateOnly ? parseISO(dateOnly) : new Date()
}

export type DatePreset = 'this-month' | 'this-quarter' | 'this-year' |
    'prev-1-month' | 'prev-2-month' | 'prev-3-month' | 'prev-6-month' |
    'prev-1-quarter' | 'prev-2-quarter' |
    'prev-1-year' | 'prev-2-year'

// Converts from a date preset to a [startDate, endDate] pair of 'date-only' string values
export function datePresetDates(preset: DatePreset, date0? : Date): string[] {
    const yearStart = fiscalYearStart()
    const parts = preset.split('-')

    let prevAndSize = 0
    if (parts[0] === 'prev' && parts.length > 2) {
        prevAndSize = Number(parts[1])
    }
    const unit = parts[parts.length - 1]

    let date = date0 ? date0 : new Date()
    let startDate = date, endDate = date

    if (unit == 'month') {
        startDate = subMonths(startOfMonth(date), prevAndSize)
        endDate = endOfMonth(addMonths(startDate, prevAndSize == 0 ? 0 : prevAndSize - 1))
    }
    else if (unit == 'quarter') {
        // Handle UK special case where fiscal year starts on April 6th
        // Apply an offset
        if (yearStart.month == 4 && yearStart.date == 6) {
            date = subDays(date, 5)
        }

        startDate = subQuarters(startOfQuarter(date), prevAndSize)

        // Reverse the offset
        if (yearStart.month == 4 && yearStart.date == 6) {
            startDate = addDays(startDate, 5)
        }

        endDate = endOfQuarter(addQuarters(startDate, prevAndSize == 0 ? 0 : prevAndSize - 1))

        // Reverse the offset
        if (yearStart.month == 4 && yearStart.date == 6) {
            endDate = addDays(endDate, 5)
        }
    }
    else if (unit == 'year') {
        const m = date.getMonth()
        const d = date.getDate()
        const y = date.getFullYear()

        if (m < yearStart.month - 1) {
            startDate = new Date(y - 1, yearStart.month - 1, yearStart.date)
        }
        else if (m == yearStart.month - 1) {
            if (d < yearStart.date) {
                startDate = new Date(y - 1, yearStart.month - 1, yearStart.date)
            }
            else {
                startDate = new Date(y, yearStart.month - 1, yearStart.date)
            }
        }
        else {
            startDate = new Date(y, yearStart.month - 1, yearStart.date)
        }

        startDate = subYears(startDate, prevAndSize)
        endDate = subDays(addYears(startDate, prevAndSize > 0 ? prevAndSize : 1), 1)
    }

    return [toDateOnly(startDate), toDateOnly(endDate)]
}
