const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// middileware
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "asdffjkjjf", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//login
app.post("/login", async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "asdffjkjjf");
        // console.log(jwtToken);
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (e) {
    console.log(e.message);
  }
});

// fetch All states
app.get("/states/", authenticateToken, async (request, response) => {
  const getstates = `SELECT state_id as stateId,state_name as stateName,population FROM state`;
  const statesFetch = await db.all(getstates);
  response.send(statesFetch);
});

// fetch by id states
app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getstates = `SELECT 
 state_id as stateId,state_name as stateName,population 
 FROM state where state_id = ${stateId}`;
  const statesFetch = await db.get(getstates);
  response.send(statesFetch);
});

// Data add
app.post("/districts/", authenticateToken, async (request, response) => {
  const dictricDetails = request.body;
  // console.log(dictricDetails);
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = dictricDetails;
  const getstates = `INSERT INTO district
  (district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}', 
  ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})`;
  const statesFetch = await db.run(getstates);
  response.send(`District Successfully Added`);
});

/// fetch by id states
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getstates = `SELECT 
 district_id as districtId,district_name as districtName ,
 state_id as stateId, cases,cured,active,deaths
 FROM district where district_id = ${districtId}`;
    const statesFetch = await db.get(getstates);
    response.send(statesFetch);
  }
);

//delete
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getstates = `DELETE
 FROM district where district_id = ${districtId}`;
    const statesFetch = await db.get(getstates);
    response.send(`District Removed`);
  }
);
//
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const dictricDetails = request.body;
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = dictricDetails;
    const getstates = `update district set
  district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured} ,
    active = ${active} ,
    deaths = ${deaths} where district_id = ${districtId}`;
    const statesFetch = await db.run(getstates);
    response.send(`District Details Updated`);
  }
);
//
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getstate = `
    SELECT
      sum(cases),
      sum(cured),
      sum(active),
      sum(deaths)
    FROM
      district where state_id = ${stateId}`;
    const statessArray = await db.all(getstate);
    const s = statessArray[0];
    response.send({
      totalCases: s["sum(cases)"],
      totalCured: s["sum(cured)"],
      totalActive: s["sum(active)"],
      totalDeaths: s["sum(deaths)"],
    });
  }
);

module.exports = app;
