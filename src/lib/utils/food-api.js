const pg = require('../pg');
const log = require('./log');
const axios = require('axios');
const API_ID = process.env.FOODAPI_ID;
const API_KEY = process.env.FOODAPI_KEY;

async function connect() {
  // Attempt to connect to the api.
  // TODO : Uncomment this when going live so it doesnt ping in dev and waste limit on api
  // const res = await axios.get('https://api.edamam.com/search', { params: { app_id: API_ID, app_key: API_KEY } }).catch(err => { console.log(err.message) })
  const res = true;
  if (res) await log.info('API Connected Successfully!');
  else await log.error('Unable To Reach The Food API!');
}

async function get(recipeID) {
  // Check if a recipe ID is sent
  if (!recipeID) throw 'Invalid Recipe ID!';
  // Get the recipe information
  const information = await pg.query(`SELECT * FROM chef.recipes WHERE recipeID = '${recipeID}'`);
  console.log('INFO', information);
  return information;
}

async function search(query) {
  // Check they sent something
  if (!query) return 'Please send a search query!';
  // If query exists then attempt to search
  let results = await axios.get('https://api.edamam.com/search', { params: { q: query, app_id: API_ID, app_key: API_KEY, to: 15 } })
    .catch(err => { console.log(err) });
  results = results.data || results;
  console.log('RESULTS', results)
  // If results are received then pass them
  if (results && results.hits.length) return results.hits;
  // If not then return an error
  else return 'No Results Found!';
}

async function check(recipeID) {
  const check = await pg.query(`SELECT idnr FROM chef.recipes WHERE recipeID = '${recipeID}'`);
  return !!(check && check.idnr);
}

async function add(recipeID, data) {
  // Check if the params are sent
  if (!recipeID || !data) throw 'All Params must be sent!';
  // Check if the database already contains this recipe
  const c = await check(recipeID);
  if (!c) {
    try {
      // Add to the database
      return await pg.query(`INSERT INTO chef.recipes (recipeID, data) VALUES ('${recipeID}', '${JSON.stringify(data)}')`);
    } catch (err) {
      return log.error('Error adding new recipe to database!', err.message || err);
    }
  }
}

async function update(recipeID, field, data) {
  // Check if the params are sent
  if (!recipeID || !field || !data) throw 'All Params must be sent!';
  // Check if the database already contains this recipe
  const c = await check;
  if (c) {
    // Found in database
    return await pg.query(`UPDATE chef.recipes SET ${field} = '${data}' WHERE recipeID = '${recipeID}'`)
  }
}

async function view(recipeID) {
  // Check recipeID is sent
  if (!recipeID) throw 'Invalid Recipe ID!';
  // Add a view to the recipe
  return await pg.query(`UPDATE chef.recipes SET times_viewed = times_viewed + 1 WHERE recipeID = '${recipeID}' RETURNING times_viewed`)
}

module.exports = { connect, get, search, check, add, update, view };
