/**
 * Copyright (c) 2020-present Beng Tan
 */

import { parseISO, addDays, subDays, endOfMonth, startOfMonth, subMonths, endOfQuarter, startOfQuarter, subQuarters, addYears, subYears } from 'date-fns'
import { Project } from './Project'

const cache: Record<string, string> = {}

// Extract the date format string of a locale
export function dateFormatString(locale?: string): string {
    if (!cache[locale!]) {
        const formatter = new Intl.DateTimeFormat(locale, {
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

        cache[locale!] = parts.join('')
    }

    return cache[locale!]
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
    return new Intl.DateTimeFormat(undefined, {
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

export type DatePreset = 'this-month' | 'this-quarter' | 'this-year' | 'prev-month' | 'prev-quarter' | 'prev-year'

// Converts from a date preset to a [startDate, endDate] pair of 'date-only' string values
export function datePresetDates(preset: DatePreset, date0? : Date): string[] {    
    const yearStart = fiscalYearStart()
    const parts = preset.split('-')
    const prev = parts[0] === 'prev'
    const unit = parts[1]
    let date = date0 ? date0 : new Date()
    let startDate = date, endDate = date

    if (unit == 'month') {
        startDate = subMonths(startOfMonth(date), prev ? 1 : 0)
        endDate = endOfMonth(startDate)
    }
    else if (unit == 'quarter') {
        // Handle UK special case where fiscal year starts on April 6th
        // Apply an offset
        if (yearStart.month == 4 && yearStart.date == 6) {
            date = subDays(date, 5)
        }

        startDate = subQuarters(startOfQuarter(date), prev ? 1 : 0)

        // Reverse the offset
        if (yearStart.month == 4 && yearStart.date == 6) {
            startDate = addDays(startDate, 5)
        }

        endDate = endOfQuarter(startDate)

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

        if (prev) {
            startDate = subYears(startDate, 1)
        }
        endDate = subDays(addYears(startDate, 1), 1)    
    }

    return [toDateOnly(startDate), toDateOnly(endDate)]
}
