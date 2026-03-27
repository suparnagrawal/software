const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres@localhost:5432/postgres' });
pool.query('SELECT 1').then(() => console.log("SUCCESS")).catch(e => console.error(e.message)).finally(() => process.exit(0));
