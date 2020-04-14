import schema from './schema/schema0'

async function initSchema(db: sqlite.Database): Promise<void> {
    for (let q of schema) {
        await db.exec(q)
    }
}

export class Project {
    isModified: boolean

    constructor(public filename: string, public database: sqlite.Database) {
        this.isModified = false
    }

    // The following functions create new in-memory database,
    // and load-to/save-from files
    static async create(): Promise<Project> {
        const project = new Project('', new sqlite.Database(':memory:'))
        await project.database.open()
        try {
            await initSchema(project.database)
            project.isModified = true
        }
        catch (e) {
            project.database.close()
            throw e
        }
        return project
    }

    static async open(filename: string): Promise<Project> {        
        const srcDb = new sqlite.Database(`file:${filename}?mode=ro`)
        await srcDb.open()
        try {
            const newDb = await srcDb.backupTo(':memory:')
            return new Project(filename, newDb)
        }
        finally {
            srcDb.close()
        }
    }

    close(): Promise<void> {
        this.filename = ''
        this.isModified = false
        return this.database.close()
    }

    async save(): Promise<boolean> {
        return this.filename ? this.saveAs(this.filename) : false
    }

    async saveAs(filename: string): Promise<boolean> {
        await this.database.exec('VACUUM')
        const destDb = await this.database.backupTo(filename)
        this.isModified = false
        destDb.close()
        return true
    }
}
