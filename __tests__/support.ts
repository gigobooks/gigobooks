// A mock of react-hook-form's setError
class _MockForm {
    constructor(public field: string, public type: string, public message: string) {
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
    }
}

export const MockForm: any = new _MockForm('', '', '')

test('dummy no op', () => {})
