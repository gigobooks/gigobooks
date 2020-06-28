/**
 * Copyright (c) 2020-present Beng Tan
 */

// A mock of react-hook-form's setValue and setError
class _MockForm {
    values: Record<string, any>

    constructor(public errorField: string, public errorType: string, public errorMessage: string) {
        this.values = {}
    }

    setValue(field: string, value: any) {
        this.values[field] = value
    }

    setError(field: string, type?: string, message?: string) {
        this.errorField = field
        this.errorType = type!
        this.errorMessage = message!
    }

    clear() {
        this.errorField = ''
        this.errorType = ''
        this.errorMessage = ''
        this.values = {}
        return this
    }
}

export const MockForm: any = new _MockForm('', '', '')
export default MockForm
