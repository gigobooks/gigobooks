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

export type FiscalYearStart = {
    date: number
    month: number
}

export function fiscalYearStart() {
    const raw = Project.variables.get('fiscalYear')
    return {
        date: Number(raw.substring(0, 2)),
        month: Number(raw.substring(2, 4)),
    }
}
