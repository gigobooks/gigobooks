/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import DatePicker from 'react-datepicker'
import { parseISO, toDateOnly, dateFormatString as dfs } from '../core'

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
                onChange={date => {
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
                onChange={date => {
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
