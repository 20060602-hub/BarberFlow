// index.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db_json');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
