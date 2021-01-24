const pg = require('../pg');
const log = require('./log');
const utils = require('../utils');
const axios = require('axios');
const API_ID = process.env.FOODAPI_ID;
const API_KEY = process.env.FOODAPI_KEY;

async function connect() {
  // Attempt to connect to the api.
  const res = await axios.get('https://api.edamam.com/search', { params: { app_id: API_ID, app_key: API_KEY } })
    .catch(err => { log.error('Caught error in api get!', err.message || err) })
  if (res && res.status === 200) await log.info('API Connected Successfully!');
  else await log.error('Unable To Reach The Food API!');
}

async function get(recipeID) {
  // Check if a recipe ID is sent
  if (!recipeID) throw 'Invalid Recipe ID!';
  // Get the recipe information
  return await pg.query(`SELECT * FROM chef.recipes WHERE recipeID = '${recipeID}'`);
}

async function search(query) {
  // Check they sent something
  if (!query) return 'Please send a search query!';
  // If query exists then attempt to search
  let results = await axios.get('https://api.edamam.com/search', { params: { q: query, app_id: API_ID, app_key: API_KEY, to: 20 } })
    .catch(err => { log.error('Error searching the API', err.message || err) });
  results = results.data || results;
  // If results are received then pass them
  if (results && results.hits.length) return results.hits;
  // If not then return an error
  else return 'No Results Found!';
}

async function check(recipeID) {
  const check = await pg.query(`SELECT idnr FROM chef.recipes WHERE recipeID = '${recipeID}'`);
  return !!(check && check.idnr);
}

async function add(data) {
  // Check if the params are sent
  if (!data) throw 'Data must be sent to save!';
  // Generate the ID
  const recipeID = data.uri.split('#')[1].substring(8, 16);
  // Check if the database already contains this recipe
  const c = await check(recipeID);
  if (!c) {
    try {
      // Add to the database
      await pg.query(`INSERT INTO chef.recipes (recipeID, data) VALUES ($1, $2)`, [recipeID, JSON.stringify(data)]);
    } catch (err) {
      return log.error('Error adding new recipe to database!', err.message || err);
    }
  }
  return recipeID;
}

async function update(recipeID, field, data) {
  // Check if the params are sent
  if (!recipeID || !field || !data) throw 'All Params must be sent!';
  // Check if the database already contains this recipe
  const c = await check;
  if (c) {
    // Found in database
    return await pg.query(`UPDATE chef.recipes SET $1 = $2 WHERE recipeID = $3`, [field, data, recipeID])
  }
}

async function view(recipeID) {
  // Check recipeID is sent
  if (!recipeID) throw 'Invalid Recipe ID!';
  // Add a view to the recipe
  return await pg.query(`UPDATE chef.recipes SET times_viewed = times_viewed + 1 WHERE recipeID = $1 RETURNING times_viewed`, [recipeID])
}

module.exports = { connect, get, search, check, add, update, view };
