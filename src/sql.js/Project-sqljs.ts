/**
 * Copyright (c) 2020-present Beng Tan
 */

// A fork of Project.ts which uses sql.js instead of gosqlite. Limited functionality.

import Knex = require('knex');
const makeKnex = require('./knex-integration-sqljs')
import { Model } from 'objection'
import { prepopulate, maybeMigrate } from '../core/database'
import { Variables } from '../core/Variables'

const defaultVariables = {
    title: '',
    address: '',
    currency: 'USD',
    otherCurrencies: [],
    taxEnable: [],
    customTaxCodes: '',
    fiscalYear: '0101',
    mru: '/settings',
    // lastSavedDate
}

let SQL: any = false
async function initSQL() {
    if (!SQL) {
        const initSqlJs = require('sql.js')
        if (typeof window === 'undefined') {
            SQL = await initSqlJs()
        }
        else {
            SQL = await initSqlJs({
                locateFile: (path: string, prefix: string) => {
                    return `dist/${path}`
                }
            })
        }
    }
}

export class Project {
    knex?: Knex
    variables?: Variables
    isModified: boolean
    changeListener: any

    constructor(public filename: string, public database: gosqlite.Database) {
        this.isModified = false
        this.onChange = this.onChange.bind(this)
    }

    async init() {
        this.variables = new Variables(this.knex!, defaultVariables)
        await this.variables.init()

        // Clear .isModified again as it was probably set during prepopulation or maybe migration
        this.isModified = false
    }

    onChange() {
        this.isModified = true
        if (this.changeListener) {
            this.changeListener(...arguments)
        }
    }

    static driver: string = 'sql.js'
    static project: Project | undefined
    static database: gosqlite.Database
    static knex: Knex
    static variables: Variables

    // The following functions create new database (defaults to in-memory),
    // and load-to/save-from files
    static async create(filename?: string): Promise<void> {
        await initSQL()
        const db = new SQL.Database()

        try {
            const project = new Project('', db)
            const knex = makeKnex(filename ? filename : ':memory:', db, project.onChange)
            project.knex = knex
            await prepopulate(knex)
            // .init() has to take place after prepopulate() as it clears .isModified
            await project.init()
            Project.bind(project)
        }
        catch (e) {
            db.close()
            throw e
        }
    }

    static async open(filename: string): Promise<void> {        
        return Promise.reject('Not implemented')
    }

    static async close(): Promise<void> {
        const p = Project.project!
        Project.project = undefined
        p.filename = ''
        return p.database.close()
    }

    static async save(): Promise<boolean> {
        return Promise.reject('Not implemented')
    }

    static async saveAs(filename: string): Promise<boolean> {
        return Promise.reject('Not implemented')
    }

    static isOpen() {
        return Project.project != undefined
    }

    // Store references so other code can access them globally
    static bind(p: Project): void {
        Project.project = p
        Project.database = p.database
        Project.knex = p.knex!
        Model.knex(p.knex)
        Project.variables = p.variables!
    }
}
