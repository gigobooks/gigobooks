import Knex = require('knex');
const makeKnex = require('../util/knex-integration')
import { Model } from 'objection'
import { prepopulate, maybeMigrate } from './database'
import { Variables } from './Variables'

const defaultVariables = {
    currency: 'USD',
    otherCurrencies: [],
    taxEnable: [],
    customTaxCodes: '',
    fiscalYear: '0101'
}

// ToDo: Validate the database, isModified flag

export class Project {
    // isModified: boolean
    variables: Variables

    static project: Project | undefined
    static database: sqlite.Database
    static knex: Knex
    static variables: Variables

    constructor(public filename: string, public database: sqlite.Database, public knex: Knex) {
        this.variables = new Variables(this.knex, defaultVariables)
    }

    async init() {
        await this.variables.init()
    }

    // The following functions create new database (defaults to in-memory),
    // and load-to/save-from files
    static async create(filename?: string): Promise<void> {
        const db = new sqlite.Database(filename ? filename : ':memory:')
        await db.open()
        try {
            const project = new Project('', db, makeKnex(filename ? filename : ':memory', db))
            await prepopulate(project.knex)
            await project.init()
            Project.bind(project)
        }
        catch (e) {
            db.close()
            throw e
        }
    }

    static async open(filename: string): Promise<void> {        
        const srcDb = new sqlite.Database(`file:${filename}?mode=ro`)
        await srcDb.open()
        try {
            const newDb = await srcDb.backupTo(':memory:')
            const project = new Project(filename, newDb, makeKnex(filename, newDb))
            await maybeMigrate(project.knex)
            await project.init()
            Project.bind(project)
        }
        finally {
            srcDb.close()
        }
    }

    static async close(): Promise<void> {
        const p = Project.project!
        Project.project = undefined
        p.filename = ''
        return p.database.close()
    }

    static async save(): Promise<boolean> {
        if (Project.project && Project.project.filename) {
            return Project.saveAs(Project.project.filename)
        }
        else {
            return Promise.reject('No filename specified')
        }
    }

    static async saveAs(filename: string): Promise<boolean> {
        await Project.database.exec('VACUUM')
        const destDb = await Project.database.backupTo(filename)
        destDb.close()
        return true
    }

    // Store references so other code can access them globally
    static bind(p: Project): void {
        Project.project = p
        Project.database = p.database
        Project.knex = p.knex
        Model.knex(p.knex)
        Project.variables = p.variables
    }
}
