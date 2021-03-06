/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { isFirstDayOfMonth, isLastDayOfMonth, isSameMonth, isSameYear } from 'date-fns'
import DatePicker from 'react-datepicker'
import { LOCALE, Project, parseISO, toDateOnly, dateFormatString as dfs } from '../core'
import { View, B, T } from './PDFView'

// Keep lists of currencies together (ie. no wrapping) unless there are a lot of them
export const CURRENCY_TOTALS_WRAP = 7

type DateRangeSelectProps = {
    startDate: string
    endDate: string
    onChange?: (startDate: string, endDate: string) => void
}

export function DateRange(props: DateRangeSelectProps) {
    const {startDate, endDate} = props
    const parsedStartDate = startDate ? parseISO(startDate) : null
    const parsedEndDate = endDate ? parseISO(endDate) : null

    return <>
        <span className='date-range date-range-start'>
            <label htmlFor='startDate'>From:</label>
            <DatePicker
                name='startDate'
                selected={parsedStartDate}
                onChange={(date: Date) => {
                    const dateOnly = date ? toDateOnly(date) : ''
                    if (props.onChange) {
                        props.onChange(dateOnly, endDate)
                    }
                }}
                selectsStart
                startDate={parsedStartDate}
                endDate={parsedEndDate}
                dateFormat={dfs()}
            />
        </span><span className='date-range date-range-end'>
            <label htmlFor='endDate'>To:</label>
            <DatePicker
                name='endDate'
                selected={parsedEndDate}
                onChange={(date: Date) => {
                    const dateOnly = date ? toDateOnly(date) : ''
                    if (props.onChange) {
                        props.onChange(startDate, dateOnly)
                    }
                }}
                selectsEnd
                startDate={parsedStartDate}
                endDate={parsedEndDate}
                dateFormat={dfs()}
            />
        </span>
    </>
}

type ReportHeaderProps = {
    title: string
    startDate?: string
    endDate: string
    children?: any
}

export function ReportHeader(props: ReportHeaderProps) {
    const format = dfs()
    const monthBeforeDate = format[0] == 'm' || format[0] == 'M'
    const endDate = parseISO(props.endDate)
    let interval: string

    if (!props.startDate) {
        interval = `${endDate.toLocaleDateString(LOCALE, {day: 'numeric', month: 'long', year: 'numeric'})}`
    }
    else {
        const startDate = parseISO(props.startDate)

        if (isSameMonth(startDate, endDate)) {
            if (isFirstDayOfMonth(startDate) && isLastDayOfMonth(endDate)) {
                interval = `${startDate.toLocaleDateString(LOCALE, {month: 'long', year: 'numeric'})}`
            }
            else {
                if (monthBeforeDate) {
                    interval = `${startDate.toLocaleDateString(LOCALE, {day: 'numeric', month: 'long'})} to ${endDate.toLocaleDateString(LOCALE, {day: 'numeric'})}, ${endDate.toLocaleDateString(LOCALE, {year: 'numeric'})}`
                }
                else {
                    interval = `${startDate.toLocaleDateString(LOCALE, {day: 'numeric'})} to ${endDate.toLocaleDateString(LOCALE, {day: 'numeric', month: 'long', year: 'numeric'})}`
                }
            }
        }
        else {
            const startOptions: any = {day: 'numeric', month: 'long', year: 'numeric'}
            const endOptions: any = {day: 'numeric', month: 'long', year: 'numeric'}

            if (isSameYear(startDate, endDate)) {
                delete startOptions.year
            }
            if (isFirstDayOfMonth(startDate)) {
                delete startOptions.day
            }
            if (isLastDayOfMonth(endDate)) {
                delete endOptions.day
            }
            interval = `${startDate.toLocaleDateString(LOCALE, startOptions)} to ${endDate.toLocaleDateString(LOCALE, endOptions)}`
        }
    }

    const now = new Intl.DateTimeFormat(LOCALE, {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(new Date())

    return <View>
        <View style={{position: 'absolute', top: 0, textAlign: 'right'}}>
            <T>{now}</T>
        </View>
        <View style={{textAlign: 'center', marginBottom: 12}}>
            <B style={{fontSize: 12}}>{Project.variables.get('title')}</B>
            <B style={{fontSize: 18}}>{props.title}</B>
            <T style={{fontSize: 12}}>{interval}</T>
            {props.children}
        </View>
    </View>
}

export function ExchangeRates({rates}: {rates: Record<string, Record<string, string>>}) {
    const lines: string[] = []
    Object.keys(rates || {}).forEach(primary => {
        const parts = [`1 ${primary}`]
        Object.keys(rates[primary] || {}).forEach(other => {
            if (rates[primary][other]) {
                parts.push(`${rates[primary][other]} ${other}`)
            }
        })

        if (parts.length > 1) {
            lines.push(parts.join(' = '))
        }
    })

    return lines.length > 0 ? <View style={{
        textAlign: 'right',
        position: 'absolute',
        bottom: 56, left: 56, right: 56,
        borderStyle: 'solid', borderColor: '#333', borderTopWidth: 1,
    }}>
        {lines.map((line, index) =>
            <T key={index} style={{fontSize: 8}}>{line}</T>)
        }
    </View> : null
}
