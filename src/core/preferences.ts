/**
 * Copyright (c) 2020-present Beng Tan
 */

import { DEFAULT_PREFERENCES } from './settings'

class Preferences {
    constructor(public defaults: Record<string, any>) {
    }

    set(name: string, value: any) {
        localStorage.setItem(name, JSON.stringify(value))
    }

    setMultiple(obj: Record<string, any>) {
        for (let name of Object.keys(obj)) {
            this.set(name, obj[name])
        }
    }

    get(name: string): any {
        let result: any
        const s = localStorage.getItem(name)
        if (s !== null && s !== undefined) {
            try {
                result = JSON.parse(s)
            } catch (e) {
            }
        }

        if (result === undefined && this.defaults[name]) {
            result = this.defaults[name]
        }
        return result
    }

    getMultiple(names: string[]): Record<string, any> {
        let results: Record<string, any> = {}

        for (let name of names) {
            results[name] = this.get(name)
        }
        return results
    }
}

export default new Preferences(DEFAULT_PREFERENCES)
