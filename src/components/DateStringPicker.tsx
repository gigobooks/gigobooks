/**
 * Copyright (c) 2020-present Beng Tan
 */

/**
 * This is a shim/wrapper around react-datepicker to return date as a string
 * instead of a Date() object
 *
 */

import * as React from 'react'
import DatePicker, {ReactDatePickerProps} from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface State {
    date: Date
    value: string
}

export class DateStringPicker extends React.Component<Partial<ReactDatePickerProps>, State> {
    parentChangeHandler: any
    child: any

    constructor(props: Partial<ReactDatePickerProps>) {
        super(props)

        const {onChange} = props
        this.parentChangeHandler = onChange
        this.child = React.createRef()

        this.handleSelect = this.handleSelect.bind(this)
        this.handleCalendarClose = this.handleCalendarClose.bind(this)

        this.state = {
            date: this.props.selected ? new Date(this.props.selected) : new Date(),
            value: '',
        }
    }

    componentDidMount() {
        this.notifyParent()
    }

    // After some experimentation, here are the rules:
    // * The value to pass up is `this.child.current.input.value` but sometimes
    //   it's stale.
    // * For onSelect(), sometimes it's stale but just notify anyway
    // * Also notify on onCalendarClose().
    //   Although sometimes onCalendarClose() is called a bit late, at least
    //   this.child.current.input.value is updated by then.
    // * For those cases when onSelect() has stale this.child.current.input.value,
    //   onCalendarClose() fires soon after with the new value.
    // * And we just finish off with some debouncing
    notifyParent() {
        const value = this.child.current.input.value
        if (this.state.value != value) {
            this.setState({value})
            this.parentChangeHandler(value)
        }
    }

    handleSelect(date: Date) {
        this.setState({date})
        this.notifyParent()
    }

    handleCalendarClose() {
        this.notifyParent()
    }

    render() {
        return <DatePicker
            onChange={() => {}}  // No-op
            {...this.props}
            ref={this.child}
            selected={this.state.date}
            onSelect={this.handleSelect}
            onCalendarClose={this.handleCalendarClose}
        />
    }
}

export default DateStringPicker
