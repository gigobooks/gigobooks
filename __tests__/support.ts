// A mock of react-hook-form's setValue and setError
class _MockForm {
    values: Record<string, any>

    constructor(public field: string, public type: string, public message: string) {
        this.values = {}
    }

    setValue(field: string, value: any) {
        this.values[field] = value
    }

    setError(field: string, type?: string, message?: string) {
        this.field = field
        this.type = type!
        this.message = message!
    }

    clear() {
        this.field = ''
        this.type = ''
        this.message = ''
        this.values = {}
        return this
    }
}

export const MockForm: any = new _MockForm('', '', '')

test('dummy no op', () => {})
