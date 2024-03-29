// Require the modules needed for database management
const pg = require('pg');
const fs = require('fs');
// Import the config details
const CONFIG = JSON.parse(fs.readFileSync('./config/data-conf.json', 'utf-8'));
// Import the log handler
const log = require('./utils/log');

// setup the database connection info
let dbConnectionObject = CONFIG.db_info;
if (process.env.DBHOST) dbConnectionObject.host = process.env.DBHOST;
if (process.env.DBPASS) dbConnectionObject.password = process.env.DBPASS;

const p = new pg.Client(CONFIG.db_info);

async function connect() {
  // Connect to the database
  await p.connect(async err => {
    if (err) await log.error('Database Connection Error', err.message);
    else await log.info('Database Connected!');
  });
}

function query(sql, queryParams, options) {
  return new Promise (async (resolve, reject) => {
    // Run the pg query
    p.query(sql, queryParams, (err, res) => {
      if (err) reject(err);
      if (options && options.parseOutput && res.rows.length) {
        let firstKey = Object.keys(res.rows[0])[0];
        let parsed = JSON.parse(res.rows[0][firstKey]);
        if (parsed.err) reject(parsed.err)
        else resolve(parsed);
      } else {
        if (res && res.rowCount > 1) resolve(res.rows);
        resolve(res && res.rows ? res.rows[0] : res);
      }
    });
  })
}

module.exports = { query, connect };
