const sql = require("mssql");
const express = require('express');
const app = express();
const cors = require('cors');
const complaint = require("./Routes/complaint");
const common = require("./Routes/common");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// this is for use routing

app.use("/", complaint);
app.use("/", common);

// Ensure 'uploads' folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Absolute path to 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });
//
const dbConfig = {
  user: "sa",
  password: "8$E5r6p8%8KH#F6V",
  server: "103.101.58.207",
  database: "licare",
  options: {
    encrypt: true, // for Azure
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig).connect()

  .then(pool => { console.log("Connected to MSSQL via connection pool"); return pool; })

  .catch(err => console.error("Database Connection Pool Error:", err));




app.listen(8081, () => {

  console.log('Server is running on http://localhost:8081');

});



//Country Master Start
app.get("/getdata", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM awt_country WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


app.post("/loginuser", async (req, res) => {
  const { Lhiuser, password } = req.body;

  console.log(Lhiuser)

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `SELECT id, Lhiuser FROM lhi_user WHERE Lhiuser = '${Lhiuser}' AND password = '${password}'`;

    console.log(sql)

    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      res.json({ id: result.recordset[0].id, Lhiuser: result.recordset[0].Lhiuser });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

app.post("/log", async (req,res) =>{
  console.log("fffrdf")
})


app.get("/requestdata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `SELECT * FROM awt_country WHERE id = ${id} AND deleted = 0`;

    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Data not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err });
  }
});


app.post("/postdata", async (req, res) => {
  const { title } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Step 1: Check if the same title exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM awt_country WHERE title = '${title}' AND deleted = 0
    `;
    const result = await pool.request().query(checkDuplicateSql);

    if (result.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, Country already exists!" });
    } else {
      // Step 2: Check if the same title exists but is soft-deleted
      const checkSoftDeletedSql = `
        SELECT * FROM awt_country WHERE title = '${title}' AND deleted = 1
      `;
      const softDeletedData = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedData.recordset.length > 0) {
        // If soft-deleted data exists, restore the entry
        const restoreSoftDeletedSql = `
          UPDATE awt_country SET deleted = 0 WHERE title = '${title}'
        `;
        await pool.request().query(restoreSoftDeletedSql);

        return res.json({
          message: "Soft-deleted data restored successfully!",
        });
      } else {
        // Step 3: Insert new data
        const insertSql = `
          INSERT INTO awt_country (title) VALUES ('${title}')
        `;
        await pool.request().query(insertSql);

        return res.json({ message: "Country added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Update existing user with duplicate check
app.put("/putdata", async (req, res) => {
  const { title, id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Step 1: Check if the same title exists for another record (other than the current one) and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM awt_country 
      WHERE title = '${title}' 
        AND id != ${id} 
        AND deleted = 0
    `;
    const result = await pool.request().query(checkDuplicateSql);

    if (result.recordset.length > 0) {
      // If a duplicate exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, title already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE awt_country 
        SET title = '${title}' 
        WHERE id = ${id}
      `;
      await pool.request().query(updateSql);

      return res.json({ message: "Country updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});


app.post("/deletedata", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
      UPDATE awt_country 
      SET deleted = 1 
      WHERE id = ${id}
    `;
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating user", error: err });
  }
});
//Country Master End

// Region start
app.get("/getregionsr", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
      SELECT r.*, c.title as country_title 
      FROM awt_region r 
      JOIN awt_country c ON r.country_id = c.id 
      WHERE r.deleted = 0
    `;
    const result = await pool.request().query(sql);

    return res.json(result.recordset); // Use `recordset` for MSSQL result
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});

// Get region by ID
app.get("/requestregion/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sqlQuery = `
      SELECT * FROM awt_region 
      WHERE id = ${id} 
        AND deleted = 0
    `;
    const result = await pool.request().query(sqlQuery);

    return res.json(result.recordset[0]); // Access the first result from recordset
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Insert new region with duplicate check
app.post("/postregion", async (req, res) => {
  const { title, country_id } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Check if the same title exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM awt_region 
      WHERE title = '${title}' AND country_id = ${country_id} AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      // Duplicate entry exists
      return res.status(409).json({ message: "Duplicate entry, Region already exists!" });
    } else {
      // Step 2: Check if the same title exists but is soft-deleted
      const checkSoftDeletedSql = `
        SELECT * FROM awt_region 
        WHERE title = '${title}' 
          AND deleted = 1
      `;
      const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedResult.recordset.length > 0) {
        // Soft-deleted entry exists, restore it
        const restoreSoftDeletedSql = `
          UPDATE awt_region 
          SET deleted = 0 
          WHERE title = '${title}'
        `;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({ message: "Soft-deleted Region restored successfully!" });
      } else {
        // Step 3: Insert new entry if no duplicates found
        const insertSql = `
          INSERT INTO awt_region (title, country_id) 
          VALUES ('${title}', ${country_id})
        `;
        await pool.request().query(insertSql);
        return res.json({ message: "Region added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Update existing region with duplicate check
app.put("/putregion", async (req, res) => {
  const { title, id, country_id } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Check if the same title exists for another record (other than the current one) and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM awt_region 
      WHERE title = '${title}' AND country_id = ${country_id} AND id != ${id} 
        AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      // Duplicate entry exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, Region already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE awt_region 
        SET title = '${title}', country_id = ${country_id} 
        WHERE id = ${id}
      `;
      await pool.request().query(updateSql);
      return res.json({ message: "Region updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error", error: err });
  }
});

app.post("/deleteregion", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to mark the region as deleted
    const sqlQuery = `UPDATE awt_region SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sqlQuery);

    return res.json(result); // Respond with the result
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating region", error: err });
  }
});

// Region End

// GEO States Start

// API to fetch all Geo states that are not soft deleted
app.get("/getgeostates", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch geostates, including country and region titles
    const sqlQuery = `
      SELECT gs.*, c.title as country_title, r.title as region_title 
      FROM awt_geostate gs 
      JOIN awt_country c ON gs.country_id = c.id 
      JOIN awt_region r ON gs.region_id = r.id 
      WHERE gs.deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sqlQuery);

    if (result.recordset.length > 0) {
      // Return the fetched geostates
      res.json(result.recordset);
    } else {
      res.status(404).json({ message: "No geostates found" });
    }
  } catch (err) {
    console.error(err); // Log error to the console for debugging
    res.status(500).json({ message: "Database error", error: err });
  }
});


// API to fetch a specific GEO state by ID
app.get("/requestgeostate/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch the geostate by ID, excluding soft-deleted records
    const sqlQuery = `
      SELECT * FROM awt_geostate 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sqlQuery);

    if (result.recordset.length > 0) {
      // Return the fetched geostate
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Geostate not found" });
    }
  } catch (err) {
    console.error(err); // Log error to the console for debugging
    res.status(500).json({ message: "Database error", error: err });
  }
});


// Insert new geostate with duplicate check
app.post("/postgeostate", async (req, res) => {
  const { title, country_id, region_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check if the same title exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM awt_geostate 
      WHERE title = '${title}' AND country_id = ${country_id} AND region_id = ${region_id} AND deleted = 0
    `;

    // Execute the query to check for duplicates
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, State already exists!" });
    }

    // Check if the same title exists but is soft-deleted
    const checkSoftDeletedSql = `
      SELECT * FROM awt_geostate 
      WHERE title = '${title}' AND deleted = 1
    `;

    const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

    if (softDeletedResult.recordset.length > 0) {
      // Restore soft-deleted entry
      const restoreSoftDeletedSql = `
        UPDATE awt_geostate SET deleted = 0 
        WHERE title = '${title}'
      `;

      await pool.request().query(restoreSoftDeletedSql);
      return res.json({ message: "Soft-deleted State restored successfully!" });
    } else {
      // Insert new entry if no duplicates found
      const insertSql = `
        INSERT INTO awt_geostate (title, country_id, region_id) 
        VALUES ('${title}', ${country_id}, ${region_id})
      `;

      await pool.request().query(insertSql);
      return res.json({ message: "State added successfully!" });
    }
  } catch (err) {
    console.error(err); // Log error to the console for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Update existing geostate with duplicate check
app.put("/putgeostate", async (req, res) => {
  const { title, id, country_id, region_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check if the same title exists for another record, excluding the current ID
    const checkDuplicateSql = `
      SELECT * FROM awt_geostate 
      WHERE title = '${title}' AND country_id = ${country_id} AND region_id = ${region_id} AND id != ${id} AND deleted = 0
    `;

    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, State already exists!" });
    }

    // Update the record if no duplicates are found
    const updateSql = `
      UPDATE awt_geostate 
      SET title = '${title}', country_id = ${country_id}, region_id = ${region_id} 
      WHERE id = ${id}
    `;

    await pool.request().query(updateSql);
    return res.json({ message: "State updated successfully!" });

  } catch (err) {
    console.error(err); // Log error to the console for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// API to soft delete a state 
app.post("/deletegeostate", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to mark the record as deleted (soft delete)
    const sql = `
      UPDATE awt_geostate 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result if successful
    return res.json(result);

  } catch (err) {
    console.error(err); // Log error to the console for debugging
    return res.status(500).json({ message: "Error updating state", error: err });
  }
});
// Geo state End

//Geo City Start
// API to fetch regions based on selected country (for the region dropdown)
app.get("/getregionscity/:country_id", async (req, res) => {
  const { country_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch regions for the given country_id, excluding soft-deleted records
    const sql = `
      SELECT * FROM awt_region 
      WHERE country_id = ${country_id} 
      AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the fetched regions
    return res.json(result.recordset);

  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// API to fetch geostates based on selected region (for the geostate dropdown)
app.get("/getgeostatescity/:region_id", async (req, res) => {
  const { region_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch geostates for the given region_id, excluding soft-deleted records
    const sql = `
      SELECT * FROM awt_geostate 
      WHERE region_id = ${region_id} 
      AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the fetched geostates
    return res.json(result.recordset);

  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


app.get("/getdistrictcity/:geostateID", async (req, res) => {
  const { geostateID } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    
    const sql = `
      SELECT * FROM awt_district 
      WHERE geostate_id = ${geostateID} 
      AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the fetched geostates
    return res.json(result.recordset);

  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// API to fetch all cities (joining countries, regions, and geostates)
app.get("/getgeocities", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch geocities with related country, region, and geostate titles
    const sql = `
      SELECT gc.*, c.title AS country_title, r.title AS region_title, gs.title AS geostate_title, d.title AS district_title
      FROM awt_geocity gc
      JOIN awt_country c ON gc.country_id = c.id
      JOIN awt_region r ON gc.region_id = r.id
      JOIN awt_geostate gs ON gc.geostate_id = gs.id
      JOIN awt_district d ON gc.district = d.id
      WHERE gc.deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the fetched geocities
    return res.json(result.recordset);

  } catch (err) {
    console.error("Database error:", err); // Log error for debugging
    return res.status(500).json({ message: "Database error", error: err.message });
  }
});



// API to fetch a specific GEO city by ID
app.get("/requestgeocity/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch a geocity by id, excluding soft-deleted records
    const sql = `SELECT * FROM awt_geocity WHERE id = ${id} AND deleted = 0`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if a record was found and return it, or respond with a 404
    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]); // Access the first record
    } else {
      return res.status(404).json({ message: "Data not found" });
    }
  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Insert new geocity with duplicate check
app.post("/postgeocity", async (req, res) => {
  const { title, country_id, region_id, geostate_id,district } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to check for duplicate entries
    const checkDuplicateSql = `SELECT * FROM awt_geocity WHERE title = '${title}' AND country_id = ${country_id} AND region_id = ${region_id} AND geostate_id =${geostate_id} AND district =${district} AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, City already exists!" });
    } else {
      // SQL query to check if the city title is soft-deleted
      const checkSoftDeletedSql = `SELECT * FROM awt_geocity WHERE title = '${title}' AND deleted = 1`;
      const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedResult.recordset.length > 0) {
        // SQL query to restore the soft-deleted city
        const restoreSoftDeletedSql = `UPDATE awt_geocity SET deleted = 0 WHERE title = '${title}'`;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({ message: "Soft-deleted City restored successfully!" });
      } else {
        // SQL query to insert a new city if no duplicates are found
        const insertSql = `INSERT INTO awt_geocity (title, country_id, region_id, geostate_id, district) VALUES ('${title}', ${country_id}, ${region_id}, ${geostate_id}, ${district})`;
        await pool.request().query(insertSql);
        return res.json({ message: "City added successfully!" });
      }
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// Update existing geocity with duplicate check
app.put("/putgeocity", async (req, res) => {
  const { title, id, country_id, region_id, geostate_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to check for duplicates (excluding the current record's id)
    const checkDuplicateSql = `SELECT * FROM awt_geocity WHERE title = '${title}' AND country_id = ${country_id} AND region_id = ${region_id} AND geostate_id =${geostate_id} AND id != ${id} AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, City already exists!" });
    } else {
      // SQL query to update the city record if no duplicates are found
      const updateSql = `UPDATE awt_geocity SET title = '${title}', country_id = ${country_id}, region_id = ${region_id}, geostate_id = ${geostate_id} WHERE id = ${id}`;
      await pool.request().query(updateSql);
      return res.json({ message: "City updated successfully!" });
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json({ message: "Database error", error: err });
  }
});


// API to soft delete a city
app.post("/deletegeocity", async (req, res) => {
  const { id } = req.body;

  try {
    // Use poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to soft delete the city by setting deleted to 1
    const sql = `UPDATE awt_geocity SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result); // Send back the result of the query
  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json({ message: "Error deleting city", error: err });
  }
});

// Geo City End

// Area Master Start
// API to fetch all countries (for the country dropdown)
// API to fetch countries
app.get("/getcountries", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = "SELECT * FROM awt_country WHERE deleted = 0";

    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});


// API to fetch regions based on selected country (for the region dropdown)
app.get("/getregions/:country_id", async (req, res) => {
  const { country_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
      SELECT * FROM awt_region 
      WHERE country_id = ${country_id} 
        AND deleted = 0
    `;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});

// API to fetch geostates based on selected region (for the geostate dropdown)
app.get("/getgeostates/:region_id", async (req, res) => {
  const { region_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
      SELECT * FROM awt_geostate 
      WHERE region_id = ${region_id} 
        AND deleted = 0
    `;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});

// API to fetch geocities based on selected geostate (for the geocity dropdown)
app.get("/getgeocities_a/:geostate_id", async (req, res) => {
  const { geostate_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
      SELECT * FROM awt_geocity 
      WHERE geostate_id = ${geostate_id} 
        AND deleted = 0
    `;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});


// API to fetch all areas (joining country, region, geostate, geocity)
app.get("/getareas", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sql = `
          SELECT a.*, c.title as country_title, r.title as region_title, gs.title as geostate_title
            FROM awt_district a
            JOIN awt_country c ON a.country_id = c.id
            JOIN awt_region r ON a.region_id = r.id
            JOIN awt_geostate gs ON a.geostate_id = gs.id
            WHERE a.deleted = 0
    `;

    const result = await pool.request().query(sql);
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

// API to fetch a specific area by ID (joining country, region, geostate, geocity)
app.get("/requestarea/:id", async (req, res) => {
  try {
    // Get the area ID from the URL parameters and ensure it is an integer
    const areaId = parseInt(req.params.id, 10);

    // Check if areaId is a valid number
    if (isNaN(areaId)) {
      return res.status(400).json({ message: "Invalid Area ID" });
    }

    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    const sqlQuery = `
      SELECT a.*,   
             c.title AS country_title, 
             r.title AS region_title, 
             gs.title AS geostate_title
      FROM awt_district  a
      JOIN awt_country c ON a.country_id = c.id
      JOIN awt_region r ON a.region_id = r.id
      JOIN awt_geostate gs ON a.geostate_id = gs.id

      WHERE a.id = @areaId AND a.deleted = 0
    `;

    // Execute the query
    const result = await pool.request()
      .input('areaId', sql.Int, areaId) // Bind areaId parameter
      .query(sqlQuery);

    // Check if the area was found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Area not found" });
    }

    // Return the area data
    return res.status(200).json(result.recordset[0]);
  } catch (err) {
    // Enhanced error logging for debugging
    console.error("Error fetching area:", err.message, err.stack);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
});


// Insert new area with duplicate check
app.post("/postarea", async (req, res) => {
  const { title, country_id, region_id, geostate_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check if the area already exists
    const checkDuplicateSql = `
      SELECT * FROM awt_district WHERE title = '${title}' AND country_id = '${country_id}' AND region_id = '${region_id}' AND geostate_id = '${geostate_id}' AND deleted = 0
    `;
    const checkResult = await pool.request().query(checkDuplicateSql);

    if (checkResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Area already exists!" });
    }

    // Insert the new area
    const insertSql = `
      INSERT INTO awt_district (title, country_id, region_id, geostate_id)
      VALUES ('${title}', ${country_id}, ${region_id}, ${geostate_id})
    `;
    const insertResult = await pool.request().query(insertSql);

    return res.json({ message: "District added successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});

// Update existing area with duplicate check
app.put("/putarea", async (req, res) => {
  const { title, id, country_id, region_id, geostate_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check if the area already exists
    const checkDuplicateSql = `
      SELECT * FROM awt_district WHERE title = '${title}' AND country_id = '${country_id}' AND region_id = '${region_id}' AND geostate_id = '${geostate_id}' AND id != ${id} AND deleted = 0
    `;

    const checkResult = await pool.request().query(checkDuplicateSql);
    
    if (checkResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Area already exists!" });
    }
    
    // Update the area
    const updateSql = `
    UPDATE awt_district 
    SET title = '${title}', country_id = ${country_id}, region_id = ${region_id}, 
    geostate_id = ${geostate_id}
    WHERE id = ${id}
    `;
    console.log(updateSql,"Update query")
    const updateResult = await pool.request().query(updateSql);

    return res.json({ message: "Area updated successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});

// API to soft delete an area
app.post("/deletearea", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Update the area to be deleted
    const sql = `
      UPDATE awt_district SET deleted = 1 WHERE id = ${id}
    `;
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error deleting area" });
  }
});
// Area End


// Pincode Master Start
// API to fetch regions based on selected country (for the region dropdown)
app.get("/getregionspincode/:country_id", async (req, res) => {
  const { country_id } = req.params;

  try {
    // Use poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to get regions based on country_id without parameter binding
    const sql = `SELECT * FROM awt_region WHERE country_id = ${country_id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset); // Send back the recordset for SQL Server results
  } catch (err) {
    console.error(err); // Log error for debugging
    return res.status(500).json(err); // Send back error response
  }
});


// API to fetch geostates based on selected region (for the geostate dropdown)
app.get("/getgeostatespincode/:region_id", async (req, res) => {
  const { region_id } = req.params;

  try {
    // Get the connection pool with poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `SELECT * FROM awt_geostate WHERE region_id = ${region_id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset); // Send back only the recordset
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Send back error response
  }
});


// API to fetch geocities based on selected geostate (for the geocity dropdown)
app.get("/getgeocities_p/:area_id", async (req, res) => {
  const { area_id } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `SELECT * FROM awt_geocity WHERE district = ${area_id} AND deleted = 0` ;
    const result = await pool.request().query(sql);

    return res.json(result.recordset); // Return only the recordset data
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Return error response
  }
});


// API to fetch areas based on selected geocity (for the area dropdown)
app.get("/getareas/:geostate_id", async (req, res) => {
  const { geostate_id } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `SELECT * FROM awt_district WHERE geostate_id = ${geostate_id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset); // Return only the recordset data
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Return error response
  }
});

// API to fetch all pincodes (joining country, region, geostate, geocity, area)
app.get("/getpincodes", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT p.*, 
             c.title as country_title, 
             r.title as region_title, 
             gs.title as geostate_title, 
             gc.title as geocity_title,
             a.title as area_title
      FROM awt_pincode p
      JOIN awt_country c ON p.country_id = c.id
      JOIN awt_region r ON p.region_id = r.id
      JOIN awt_geostate gs ON p.geostate_id = gs.id
      JOIN awt_geocity gc ON p.geocity_id = gc.id
      JOIN awt_district a ON p.area_id = a.id
      WHERE p.deleted = 0 ORDER BY p.id DESC
    `;

    // Execute the query and get the results
    const result = await pool.request().query(sql);

    // Return only the recordset from the result
    return res.json(result.recordset);
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Return error response
  }
});

// API to fetch a specific pincode by ID (joining country, region, geostate, geocity, area)
app.get("/requestpincode/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract the pincodeId from request parameters

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT p.*, 
                  c.title AS country_title, 
                  r.title AS region_title, 
                  gs.title AS geostate_title, 
                  gc.title AS geocity_title,
                  a.title AS area_title
            FROM awt_pincode p
            INNER JOIN awt_country c ON p.country_id = c.id
            INNER JOIN awt_region r ON p.region_id = r.id
            INNER JOIN awt_geostate gs ON p.geostate_id = gs.id
            INNER JOIN awt_geocity gc ON p.geocity_id = gc.id
            INNER JOIN awt_district a ON p.area_id = a.id
            WHERE p.id = 202 AND p.deleted = 0 
    `;

    // Execute the query and get the result
    const result = await pool.request().query(sql);

    // If no data found, return a 404 response
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Pincode not found" });
    }

    // Return the first record (since it's a single pincode query)
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching pincode:", err); // Log the error for debugging
    return res.status(500).json({ message: "Internal Server Error", error: err }); // Return error response
  }
});

// Insert new pincode with duplicate check (considering country_id)
app.post("/postpincode", async (req, res) => {
  const { pincode, country_id, region_id, geostate_id, geocity_id, area_id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Check for duplicates based on pincode and country_id
    const checkDuplicateSql = `
      SELECT * FROM awt_pincode 
      WHERE pincode = ${pincode} 
      AND country_id = ${country_id} 
      AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Pincode already exists in this country!"
      });
    } else {
      // If no duplicate, insert the new pincode
      const insertSql = `
        INSERT INTO awt_pincode (pincode, country_id, region_id, geostate_id, geocity_id, area_id) 
        VALUES (${pincode}, ${country_id}, ${region_id}, ${geostate_id}, ${geocity_id}, ${area_id})
      `;
      const insertResult = await pool.request().query(insertSql);

      return res.json({ message: "Pincode added successfully!" });
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Return error response
  }
});

// Update existing pincode with duplicate check (considering country_id)
app.put("/putpincode", async (req, res) => {
  const {
    pincode,
    id,
    country_id,
    region_id,
    geostate_id,
    geocity_id,
    area_id,
  } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Check for duplicates based on pincode and country_id
    const checkDuplicateSql = `
      SELECT * FROM awt_pincode 
      WHERE pincode = ${pincode} 
      AND country_id = ${country_id} 
      AND id != ${id} 
      AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Pincode already exists in this country!"
      });
    } else {
      // If no duplicate, update the pincode
      const updateSql = `
        UPDATE awt_pincode 
        SET pincode = ${pincode}, 
            country_id = ${country_id}, 
            region_id = ${region_id}, 
            geostate_id = ${geostate_id}, 
            geocity_id = ${geocity_id}, 
            area_id = ${area_id} 
        WHERE id = ${id}
      `;
      const updateResult = await pool.request().query(updateSql);

      return res.json({ message: "Pincode updated successfully!" });
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json(err); // Return error response
  }
});

// API to soft delete a pincode
app.post("/deletepincode", async (req, res) => {
  const { id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE awt_pincode 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result
    return res.json(result);
  } catch (err) {
    console.error("Error deleting pincode:", err); // Log the error for debugging
    return res.status(500).json({ message: "Error deleting pincode", error: err });
  }
});
// Pincode Master End

//Start Product List
app.get("/getproductlist", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly use the query (no parameter binding)
    const sql = "SELECT * FROM product_master ORDER BY id ASC";

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result as JSON
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});
// Product list end

//Category Start
app.get("/getcat", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query
    const sql = `
      SELECT * 
      FROM awt_category 
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return only the recordset from the result
    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching categories:", err); // Log the error for debugging
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

// Insert for category
app.post("/postdatacat", async (req, res) => {
  const { title } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the same title exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_category 
      WHERE title = '${title}' AND deleted = 0
    `;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, Country already exists!" });
    } else {
      // Step 2: Check if the same title exists but is soft-deleted
      const checkSoftDeletedSql = `
        SELECT * 
        FROM awt_category 
        WHERE title = '${title}' AND deleted = 1
      `;
      const softDeletedCheckResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedCheckResult.recordset.length > 0) {
        // If soft-deleted data exists, restore the entry
        const restoreSoftDeletedSql = `
          UPDATE awt_category 
          SET deleted = 0 
          WHERE title = '${title}'
        `;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({ message: "Soft-deleted data restored successfully!" });
      } else {
        // Step 3: Insert new entry if no duplicates found
        const insertSql = `
          INSERT INTO awt_category (title) 
          VALUES ('${title}')
        `;
        await pool.request().query(insertSql);
        return res.json({ message: "Category added successfully!" });
      }
    }
  } catch (err) {
    console.error("Error adding category:", err); // Log the error for debugging
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

// edit for category
app.get("/requestdatacat/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM awt_category 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query and get the results
    const result = await pool.request().query(sql);

    // Check if the result is empty
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Return the first record from the result set
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching category:", err); // Log the error for debugging
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

// update for category
app.put("/putcatdata", async (req, res) => {
  const { title, id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Direct SQL query to check for duplicates without parameter binding
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_category 
      WHERE title = '${title}' AND id != ${id} AND deleted = 0
    `;

    // Execute the duplicate check query
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      // If a duplicate title exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, title already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE awt_category 
        SET title = '${title}' 
        WHERE id = ${id}
      `;

      // Execute the update query
      await pool.request().query(updateSql);

      return res.json({ message: "Category updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating category:", err); // Log the error for debugging
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

// delete for category
app.post("/deletecatdata", async (req, res) => {
  const { id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE awt_category 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the update query
    const result = await pool.request().query(sql);

    // Return the result
    return res.json(result);
  } catch (err) {
    console.error("Error deleting category:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating category" });
  }
});

//sub category start
// fetch data for subcategory
app.get("/getsubcategory", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT r.*, 
             c.title as category_title 
      FROM awt_subcat r 
      JOIN awt_category c ON r.category_id = c.id 
      WHERE r.deleted = 0
    `;

    // Execute the query and get the results
    const result = await pool.request().query(sql);

    // Return only the recordset from the result
    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching subcategories:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching subcategories" });
  }
});

// fetch subcat for specific subcats uding id

app.get("/requestsubcat/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;


    const sql = `
      SELECT * 
      FROM awt_subcat 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query and get the results
    const result = await pool.request().query(sql);

    // Return the first record from the recordset if it exists, else return an empty object
    return res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("Error fetching subcategory by ID:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching subcategory" });
  }
});

// insert for subcategory
app.post("/postsubcategory", async (req, res) => {
  try {
    const { title, category_id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the same title exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_subcat 
      WHERE title = '${title}' AND deleted = 0
    `;
    const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

    if (checkDuplicateResult.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, subcat already exists!" });
    } else {
      // Step 2: Check if the same title exists but is soft-deleted
      const checkSoftDeletedSql = `
        SELECT * 
        FROM awt_subcat 
        WHERE title = '${title}' AND deleted = 1
      `;
      const checkSoftDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (checkSoftDeletedResult.recordset.length > 0) {
        // If soft-deleted data exists, restore the entry
        const restoreSoftDeletedSql = `
          UPDATE awt_subcat 
          SET deleted = 0 
          WHERE title = '${title}'
        `;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({ message: "Soft-deleted subcat restored successfully!" });
      } else {
        // Step 3: Insert new entry if no duplicates found
        const insertSql = `
          INSERT INTO awt_subcat (title, category_id) 
          VALUES ('${title}', ${category_id})
        `;
        await pool.request().query(insertSql);
        return res.json({ message: "subcat added successfully!" });
      }
    }
  } catch (err) {
    console.error("Error processing subcategory:", err); // Log error for debugging
    return res.status(500).json({ message: "Error processing subcategory" });
  }
});

// update for subcategory
app.put("/putsubcategory", async (req, res) => {
  try {
    const { title, id, category_id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the same title exists for another record (other than the current one) and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_subcat 
      WHERE title = '${title}' AND id != ${id} AND deleted = 0
    `;
    const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

    if (checkDuplicateResult.recordset.length > 0) {
      // If a duplicate exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, subcat already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE awt_subcat 
        SET title = '${title}', category_id = ${category_id} 
        WHERE id = ${id}
      `;
      await pool.request().query(updateSql);
      return res.json({ message: "subcat updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating subcategory:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating subcategory" });
  }
});

// delete for subcategory
app.post("/deletesubcat", async (req, res) => {
  try {
    const { id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;


    const sql = `
      UPDATE awt_subcat 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error("Error updating subcategory:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating subcategory" });
  }
});

//fetch data for category dropdown
app.get("/getcategory", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    const sql = `
      SELECT * 
      FROM awt_category 
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching categories:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching categories" });
  }
});

//channel Partner start
app.get("/getcdata", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM awt_channelpartner 
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching channel partner data:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching channel partner data" });
  }
});

// Insert for Channelpartner
app.post("/postcdata", async (req, res) => {
  try {
    const { Channelpartner } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the same channelpartner exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_channelpartner 
      WHERE Channel_partner = '${Channelpartner}' AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, Channelpartner already exists!" });
    } else {
      // Step 2: Check if the same channelpartner exists but is soft-deleted
      const checkSoftDeletedSql = `
        SELECT * 
        FROM awt_channelpartner 
        WHERE Channel_partner = '${Channelpartner}' AND deleted = 1
      `;
      const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedResult.recordset.length > 0) {
        // If soft-deleted data exists, restore the entry
        const restoreSoftDeletedSql = `
          UPDATE awt_channelpartner 
          SET deleted = 0 
          WHERE Channel_partner = '${Channelpartner}'
        `;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({ message: "Soft-deleted data restored successfully!" });
      } else {
        // Step 3: Insert new entry if no duplicates found
        const insertSql = `
          INSERT INTO awt_channelpartner (Channel_partner) 
          VALUES ('${Channelpartner}')
        `;
        await pool.request().query(insertSql);
        return res.json({ message: "Channel partner added successfully!" });
      }
    }
  } catch (err) {
    console.error("Error handling channel partner data:", err); // Log error for debugging
    return res.status(500).json({ message: "Error handling channel partner data" });
  }
});




// edit for Channelpartner

app.get("/requestcdata/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM awt_channelpartner 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query and get the results
    const result = await pool.request().query(sql);

    // Return the first record from the recordset if it exists, else return an empty object
    return res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("Error fetching channel partner by ID:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching channel partner" });
  }
});


// update for Channelpartner
app.put("/putcdata", async (req, res) => {
  try {
    const { Channelpartner, id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the same channelpartner exists for another record (other than the current one) and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM awt_channelpartner 
      WHERE Channel_partner = '${Channelpartner}' AND id != ${id} AND deleted = 0
    `;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      // If a duplicate exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, Channelpartner already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE awt_channelpartner 
        SET Channel_partner = '${Channelpartner}' 
        WHERE id = ${id}
      `;
      await pool.request().query(updateSql);
      return res.json({ message: "Channelpartner updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating channel partner:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating channel partner" });
  }
});

// delete for Channelpartner
app.post("/deletecdata", async (req, res) => {
  try {
    const { id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE awt_channelpartner 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    await pool.request().query(sql);

    // Return success message
    return res.json({ message: "Channel partner deleted successfully!" });
  } catch (err) {
    console.error("Error deleting channel partner:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating channel partner" });
  }
});


// complaint code start

app.get("/getcom", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    const sql = `
      SELECT * 
      FROM complaint_code 
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching complaint codes:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching complaint codes" });
  }
});

// Insert for complaintcode
app.post("/postdatacom", async (req, res) => {
  try {
    const { id, complaintcode, created_by } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    if (id) {
      // Step 1: Check if the same complaintcode exists and is not soft-deleted for other IDs
      const checkDuplicateSql = `
        SELECT * 
        FROM complaint_code 
        WHERE complaintcode = '${complaintcode}' AND id != ${id} AND deleted = 0
      `;
      const duplicateData = await pool.request().query(checkDuplicateSql);

      if (duplicateData.recordset.length > 0) {
        // If duplicate data exists for another ID
        return res.status(409).json({ message: "Duplicate entry, complaintcode already exists!" });
      } else {
        // Step 2: Update the entry with the given ID
        const updateSql = `
          UPDATE complaint_code 
          SET complaintcode = '${complaintcode}', updated_date = GETDATE(), updated_by = '${created_by}' 
          WHERE id = ${id}
        `;
        await pool.request().query(updateSql);

        return res.json({ message: "complaintcode updated successfully!" });
      }
    } else {
      // Step 3: Same logic as before for insert if ID is not provided
      // Check if the same complaintcode exists and is not soft-deleted
      const checkDuplicateSql = `
        SELECT * 
        FROM complaint_code 
        WHERE complaintcode = '${complaintcode}' AND deleted = 0
      `;
      const duplicateData = await pool.request().query(checkDuplicateSql);

      if (duplicateData.recordset.length > 0) {
        // If duplicate data exists (not soft-deleted)
        return res.status(409).json({ message: "Duplicate entry, complaintcode already exists!" });
      } else {
        // Check if the same complaintcode exists but is soft-deleted
        const checkSoftDeletedSql = `
          SELECT * 
          FROM complaint_code 
          WHERE complaintcode = '${complaintcode}' AND deleted = 1
        `;
        const softDeletedData = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedData.recordset.length > 0) {
          // If soft-deleted data exists, restore the entry
          const restoreSoftDeletedSql = `
            UPDATE complaint_code 
            SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' 
            WHERE complaintcode = '${complaintcode}'
          `;
          await pool.request().query(restoreSoftDeletedSql);

          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new entry if no duplicates found
          const insertSql = `
            INSERT INTO complaint_code (complaintcode, created_date, created_by) 
            VALUES ('${complaintcode}', GETDATE(), '${created_by}')
          `;
          await pool.request().query(insertSql);

          return res.json({ message: "complaintcode added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error("Error processing request:", err); // Log error for debugging
    return res.status(500).json({ message: "Error processing request" });
  }
});

// edit for complaintcode

app.get("/requestdatacom/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM complaint_code 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if data is found and return the first entry
    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Complaint code not found" });
    }
  } catch (err) {
    console.error("Error fetching complaint code:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching complaint code" });
  }
});

// update for complaintcode
// update for complaintcode
app.put("/putcomdata", async (req, res) => {
  try {
    const { id, complaintcode, updated_by } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the updated complaintcode already exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * 
      FROM complaint_code 
      WHERE complaintcode = '${complaintcode}' 
        AND deleted = 0 
        AND id != ${id}
    `;

    // Execute the query to check for duplicates
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      // If duplicate data exists
      return res.status(409).json({ message: "Duplicate entry, complaintcode already exists!" });
    } else {
      // Step 2: Update complaintcode data if no duplicates found
      const updateSql = `
        UPDATE complaint_code 
        SET complaintcode = '${complaintcode}', 
            updated_by = '${updated_by}', 
            updated_date = GETDATE() 
        WHERE id = ${id} AND deleted = 0
      `;

      // Execute the update query
      await pool.request().query(updateSql);

      return res.json({ message: "Complaintcode updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating complaintcode:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating complaintcode" });
  }
});

// delete for complaintcode
app.post("/deletecomdata", async (req, res) => {
  try {
    const { id } = req.body;

    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE complaint_code 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    await pool.request().query(sql);

    // Return success message
    return res.json({ message: "Complaint code deleted successfully!" });
  } catch (err) {
    console.error("Error deleting complaint code:", err); // Log error for debugging
    return res.status(500).json({ message: "Error updating complaint code" });
  }
});

//Reason Code Start
// Get all reason codes
app.get("/getreason", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = "SELECT * FROM reason_code WHERE deleted = 0";

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result as JSON
    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching reason codes:", err); // Log error for debugging
    return res.status(500).json({ message: "Error fetching reason codes" });
  }
});

// Insert or update reason code
app.post("/postdatareason", async (req, res) => {
  const { id, reasoncode, created_by } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    if (id) {
      // Step 1: Check if the same reasoncode exists and is not soft-deleted for other IDs
      const checkDuplicateSql = `
        SELECT * FROM reason_code 
        WHERE reasoncode = '${reasoncode}' 
        AND id != ${id} 
        AND deleted = 0
      `;

      // Execute the query
      const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

      if (checkDuplicateResult.recordset.length > 0) {
        // If duplicate data exists for another ID
        return res.status(409).json({ message: "Duplicate entry, reasoncode already exists!" });
      } else {
        // Step 2: Update the entry with the given ID
        const updateSql = `
          UPDATE reason_code 
          SET reasoncode = '${reasoncode}', 
              updated_date = GETDATE(), 
              updated_by = '${created_by}' 
          WHERE id = ${id}
        `;

        // Execute the query
        await pool.request().query(updateSql);

        return res.json({ message: "reasoncode updated successfully!" });
      }
    } else {
      // Step 3: Same logic as before for insert if ID is not provided

      // Check if the same reasoncode exists and is not soft-deleted
      const checkDuplicateSql = `
        SELECT * FROM reason_code 
        WHERE reasoncode = '${reasoncode}' 
        AND deleted = 0
      `;

      // Execute the query
      const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

      if (checkDuplicateResult.recordset.length > 0) {
        // If duplicate data exists (not soft-deleted)
        return res.status(409).json({ message: "Duplicate entry, reasoncode already exists!" });
      } else {
        // Check if the same reasoncode exists but is soft-deleted
        const checkSoftDeletedSql = `
          SELECT * FROM reason_code 
          WHERE reasoncode = '${reasoncode}' 
          AND deleted = 1
        `;

        // Execute the query
        const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedResult.recordset.length > 0) {
          // If soft-deleted data exists, restore the entry
          const restoreSoftDeletedSql = `
            UPDATE reason_code 
            SET deleted = 0, 
                updated_date = GETDATE(), 
                updated_by = '${created_by}' 
            WHERE reasoncode = '${reasoncode}'
          `;

          // Execute the query
          await pool.request().query(restoreSoftDeletedSql);

          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new entry if no duplicates found
          const insertSql = `
            INSERT INTO reason_code (reasoncode, created_date, created_by) 
            VALUES ('${reasoncode}', GETDATE(), '${created_by}')
          `;

          // Execute the query
          await pool.request().query(insertSql);

          return res.json({ message: "reasoncode added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error("Error handling reasoncode:", err);
    return res.status(500).json({ message: "Error handling reasoncode" });
  }
});

// Edit reason code by ID
app.get("/requestdatareason/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query with the 'id' value inserted directly into the query string
    const sql = `
      SELECT * FROM reason_code 
      WHERE id = ${id} 
      AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the first result, assuming the ID is unique
    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Reason not found" });
    }
  } catch (err) {
    console.error("Error fetching reason code:", err);
    return res.status(500).json({ message: "Error fetching reason code" });
  }
});

// Update reason code
app.put("/putreasondata", async (req, res) => {
  const { id, reasoncode, updated_by } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Step 1: Check if the updated reasoncode already exists and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM reason_code 
      WHERE reasoncode = '${reasoncode}' 
      AND deleted = 0 
      AND id != ${id}
    `;

    // Execute the check duplicate query
    const checkResult = await pool.request().query(checkDuplicateSql);

    if (checkResult.recordset.length > 0) {
      // If duplicate data exists
      return res.status(409).json({ message: "Duplicate entry, reasoncode already exists!" });
    } else {
      // Step 2: Update reasoncode data if no duplicates found
      const sql = `
        UPDATE reason_code 
        SET reasoncode = '${reasoncode}', 
            updated_by = '${updated_by}', 
            updated_date = GETDATE() 
        WHERE id = ${id} AND deleted = 0
      `;

      // Execute the update query
      await pool.request().query(sql);

      // Return success message
      return res.json({ message: "reasoncode updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating reasoncode:", err);
    return res.status(500).json({ message: "Error updating reasoncode" });
  }
});

// Soft-delete reason code by ID
app.post("/deletereasondata", async (req, res) => {
  const { id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE reason_code 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    await pool.request().query(sql);

    // Return success message
    return res.json({ message: "Reason data deleted successfully!" });
  } catch (err) {
    console.error("Error deleting reason data:", err);
    return res.status(500).json({ message: "Error updating reason data" });
  }
});

// Reason Code end

//action code Start
app.get("/getaction", async (req, res) => {
  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM action_code 
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if data was found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Return the result set
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});



// Insert for actioncode
app.post("/postdataaction", async (req, res) => {
  const { id, actioncode, created_by } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    if (id) {
      // Direct SQL query without parameter binding to check for duplicates on update
      const checkDuplicateSql = `
        SELECT * 
        FROM action_code 
        WHERE actioncode = '${actioncode}' AND id != ${id} AND deleted = 0
      `;

      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, actioncode already exists!" });
      } else {
        // Direct SQL query without parameter binding for update
        const updateSql = `
          UPDATE action_code 
          SET actioncode = '${actioncode}', updated_date = GETDATE(), updated_by = '${created_by}' 
          WHERE id = ${id}
        `;
        await pool.request().query(updateSql);
        return res.json({ message: "actioncode updated successfully!" });
      }
    } else {
      // Direct SQL query without parameter binding to check for duplicates on insert
      const checkDuplicateSql = `
        SELECT * 
        FROM action_code 
        WHERE actioncode = '${actioncode}' AND deleted = 0
      `;

      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, actioncode already exists!" });
      } else {
        // Check if a soft-deleted entry with the same actioncode exists
        const checkSoftDeletedSql = `
          SELECT * 
          FROM action_code 
          WHERE actioncode = '${actioncode}' AND deleted = 1
        `;

        const softDeletedCheckResult = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedCheckResult.recordset.length > 0) {
          // Restore the soft-deleted entry
          const restoreSoftDeletedSql = `
            UPDATE action_code 
            SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' 
            WHERE actioncode = '${actioncode}'
          `;
          await pool.request().query(restoreSoftDeletedSql);
          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert a new action code
          const insertSql = `
            INSERT INTO action_code (actioncode, created_date, created_by) 
            VALUES ('${actioncode}', GETDATE(), '${created_by}')
          `;
          await pool.request().query(insertSql);
          return res.json({ message: "actioncode added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error("Error handling action data:", err);
    return res.status(500).json({ message: "Error handling action data" });
  }
});

// edit for actioncode
app.get("/requestdataaction/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM action_code 
      WHERE id = ${id} AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the first matching record
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error retrieving action data:", err);
    return res.status(500).json({ message: "Error retrieving action data" });
  }
});

// update for actioncode
app.put("/putactiondata", async (req, res) => {
  const { id, actioncode, updated_by } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding to check for duplicates
    const checkDuplicateSql = `
      SELECT * 
      FROM action_code 
      WHERE actioncode = '${actioncode}' AND deleted = 0 AND id != ${id}
    `;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, actioncode already exists!" });
    } else {
      // Direct SQL query without parameter binding for the update
      const sql = `
        UPDATE action_code 
        SET actioncode = '${actioncode}', updated_by = '${updated_by}', updated_date = GETDATE() 
        WHERE id = ${id} AND deleted = 0
      `;
      await pool.request().query(sql);
      return res.json({ message: "actioncode updated successfully!" });
    }
  } catch (err) {
    console.error("Error updating action data:", err);
    return res.status(500).json({ message: "Error updating action data" });
  }
});

// delete for actioncode
app.post("/deleteactiondata", async (req, res) => {
  const { id } = req.body;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      UPDATE action_code 
      SET deleted = 1 
      WHERE id = ${id}
    `;

    // Execute the query
    await pool.request().query(sql);

    // Return success response
    return res.json({ message: "Action code deleted successfully!" });
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

// Start Complaint View
app.get("/getcomplaintview/:complaintid", async (req, res) => {
  const { complaintid } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM complaint_ticket 
      WHERE id = ${complaintid} AND deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if data was found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Return the first result
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

app.post("/addcomplaintremark", async (req, res) => {
  const { ticket_no, note, created_by } = req.body;
  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const pool = await poolPromise;

    // Insert remark and retrieve the remark_id
    const sql = `
      INSERT INTO awt_complaintremark (ticket_no, remark, created_by, created_date)
      OUTPUT INSERTED.id AS remark_id
      VALUES ('${ticket_no}', '${note}', '${created_by}', '${formattedDate}')
    `;

    const result = await pool.request().query(sql);
    const remark_id = result.recordset[0].remark_id;

    return res.json({
      message: "Remark added successfully!",
      remark_id: remark_id // Send the generated remark ID back to the client
    });
  } catch (err) {
    console.error("Error inserting remark:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});



app.post("/uploadcomplaintattachments", upload.array("attachment"), async (req, res) => {
  const { ticket_no, remark_id, created_by } = req.body;
  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    const pool = await poolPromise;

    // Combine filenames into a comma-separated string
    const attachments = req.files.map((file) => file.filename);
    const attachmentString = attachments.join(", ");

    // Insert the attachments with the remark_id obtained from the previous step
    const sql = `
      INSERT INTO awt_complaintattachment (remark_id, ticket_no, attachment, created_by, created_date)
      VALUES (${remark_id}, '${ticket_no}', '${attachmentString}', ${created_by}, '${formattedDate}')
    `;
    console.log("SQL Query:", sql);

    await pool.request().query(sql);

    return res.json({
      message: "Files uploaded successfully",
      remark_id: remark_id // return remark_id for confirmation
    });

  } catch (err) {
    console.error("Error inserting attachments:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});




app.get("/getComplaintDetails/:ticket_no", async (req, res) => {
  const ticket_no = req.params.ticket_no;

  try {
    const pool = await poolPromise;

    // Direct SQL query without parameter binding for remarks
    const remarkQuery = `SELECT ac.*, lu.Lhiuser FROM awt_complaintremark as ac LEFT JOIN lhi_user as lu ON lu.id = ac.created_by WHERE ac.ticket_no = ${"'" + ticket_no + "'"}`;

    // Execute remark query
    const remarksResult = await pool.request().query(remarkQuery);
    const remarks = remarksResult.recordset;

    // Direct SQL query without parameter binding for attachments
    const attachmentQuery = `
      SELECT * FROM awt_complaintattachment
      WHERE ticket_no = ${"'" + ticket_no + "'"}
    `;


    // Execute attachment query
    const attachmentsResult = await pool.request().query(attachmentQuery);
    const attachments = attachmentsResult.recordset;

    // Return both remarks and attachments in a single response
    res.json({ remarks, attachments });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred", details: err.message });
  }
});



// getComplaintDuplicate for MS SQL rswithout parameter binding
app.get("/getComplaintDuplicate/:customer_mobile", async (req, res) => {
  const { customer_mobile } = req.params;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * 
      FROM complaint_ticket 
      WHERE customer_mobile = '${customer_mobile}' 
      AND deleted = 0 
      ORDER BY id DESC
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the data
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred", details: err.message });
  }
});


// End Complaint View

app.post("/uploadAttachment2", upload.array("attachment2"), async (req, res) => {
  const { ticket_no, created_by } = req.body;
  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Validate request
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  // Get all filenames and join them
  const attachments = req.files.map((file) => file.filename);
  const attachmentString = attachments.join(", ");

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Adjusted SQL query without line breaks and extra characters
    const sql = `
      INSERT INTO awt_attachment2 (ticket_no, attachment, created_by, created_date) 
      OUTPUT INSERTED.id
      VALUES ('${ticket_no}', '${attachmentString}', '${created_by}', '${formattedDate}')
    `;

    // Execute the query and get the inserted ID
    const result = await pool.request().query(sql);

    // Return the success message along with the inserted ID
    return res.json({
      message: "Files uploaded successfully",
      count: attachments.length,
      insertId: result.recordset[0].id  // Should now correctly return the ID
    });
  } catch (err) {
    console.error("Error inserting attachment 2:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});







// Route to get attachment 2 details
app.get("/getAttachment2Details/:ticket_no", async (req, res) => {
  const ticket_no = req.params.ticket_no;

  try {
    // Access the connection pool using poolPromise
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT ac.*, lu.Lhiuser 
      FROM awt_attachment2 as ac 
      LEFT JOIN lhi_user as lu 
      ON ac.created_by = lu.id 
      WHERE ac.ticket_no = '${ticket_no}' 
      ORDER BY created_date DESC
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the attachment details
    return res.json({ attachments2: result.recordset });
  } catch (err) {
    console.error("Error fetching attachment 2:", err);
    return res.status(500).json({ error: "Error fetching attachments", details: err.message });
  }
});

//Complaint view  Attachment 2 End

app.get("/getcvengineer", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * FROM awt_engineermaster
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the entire array of data
    return res.json(result.recordset);

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

app.get("/getProducts", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * FROM awt_engineermaster
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the entire array of data
    return res.json(result.recordset);

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

app.get("/getchildfranchises", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Direct SQL query without parameter binding
    const sql = `
      SELECT * FROM awt_childfranchisemaster
      WHERE deleted = 0
    `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the entire array of data
    return res.json(result.recordset);

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

//Complaint View End

// S added for Complaint Registration

app.get("/getstate", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id, region_id, title FROM awt_geostate WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


app.get("/product_master", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM product_master");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});



// Ticket Search Start
app.post("/getticketendcustomer", async (req, res) => {
  let { searchparam } = req.body;

  if (searchparam === "") {
    return res.json([]);
  }

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const sql = `
SELECT c.*, 
       l.address, 
       CONCAT(c.customer_fname, ' ', c.customer_lname) AS customer_name
FROM awt_customer AS c 
LEFT JOIN awt_customerlocation AS l ON c.id = l.customer_id 
WHERE c.deleted = 0 
  AND (c.email LIKE '%${searchparam}%' 
       OR c.mobileno LIKE '%${searchparam}%')


    `;

    const result = await pool.request().query(sql);

    // Product of End Customer using customer_id | in Table awt_customer id is primary key and customer_id is foreign key in awt_customerlocation
    const sql1 = `
    SELECT * FROM awt_uniqueproductmaster
    WHERE deleted = 0 AND customer_id = @customerId
  `;
// console.log(result.recordset[0])
  const result1 = await pool.request()
    .input('customerId', result.recordset[0].id)
    .query(sql1);

    if(result1.recordset === 0){
        return res.json({ information : result.recordset ,product : []}); 
    }
    else {

      return res.json({ information : result.recordset ,product : result1.recordset});
    }
  } catch (err) {
    console.error(err);
    return res.json({ information : [], product : []});
  }
});


// Add Complaint Start
app.post("/add_complaintt", async (req, res) => {
  let {
    complaint_date, customer_name, contact_person, email, mobile, address,
    state, city, area, pincode, mode_of_contact, ticket_type, cust_type,
    warrenty_status, invoice_date, call_charge, cust_id, model
  } = req.body;

  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Get the connection pool
    const pool = await poolPromise;

    // First query to count existing complaints
    const checkResult = await pool.request().query("SELECT * FROM complaint_ticket WHERE deleted = 0");
    const count = checkResult.recordset.length + 1;

    // Generate ticket number based on date and count
    const formatDate = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}`;
    const countFormat = count.toString().padStart(4, "0");
    const ticket_no = 'IG' + formatDate + "-" + countFormat;

    // Insert new complaint with parameterized queries
    const insertSQL = `
      INSERT INTO complaint_ticket (
        ticket_no, ticket_date, customer_name, customer_mobile, customer_email, address, 
        state, city, area, pincode, customer_id, ModelNumber, ticket_type, call_type, 
        call_status, warranty_status, invoice_date, call_charges, mode_of_contact, 
        contact_person, assigned_to, created_date, created_by, engineer_id
      ) 
      VALUES (
        @ticket_no, @complaint_date, @customer_name, @mobile, @email, @address, 
        @state, @city, @area, @pincode, @cust_id, @model, @ticket_type, @cust_type, 
        'Pending', @warrenty_status, @invoice_date, @call_charge, @mode_of_contact, 
        @contact_person, 1, @formattedDate, 1, 1
      )`;

    const request = pool.request()
      .input('ticket_no', ticket_no)
      .input('complaint_date', complaint_date)
      .input('customer_name', customer_name)
      .input('mobile', mobile)
      .input('email', email)
      .input('address', address)
      .input('state', state)
      .input('city', city)
      .input('area', area)
      .input('pincode', pincode)
      .input('cust_id', cust_id)
      .input('model', model)
      .input('ticket_type', ticket_type)
      .input('cust_type', cust_type)
      .input('warrenty_status', warrenty_status)
      .input('invoice_date', invoice_date)
      .input('call_charge', call_charge)
      .input('mode_of_contact', mode_of_contact)
      .input('contact_person', contact_person)
      .input('formattedDate', formattedDate);



    const insertResult = await request.query(insertSQL);

    // console.log(insertSQL,"%%")
    return res.json({ insertId: insertResult.rowsAffected[0] });
  } catch (err) {
    console.error("Error inserting complaint:", err);
    return res.status(500).json({ error: 'An error occurred while adding the complaint', details: err.message });
  }
});



// S End for Complaint Registration


// y start
//Grouping Master Start

app.get("/getchildfranchisegroupm", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool (or you can use another pool initialization if needed)
    const pool = await poolPromise;
    // Perform the query
    const result = await pool.request().query("SELECT * FROM awt_childfranchisemaster WHERE deleted = 0");
    return res.json(result.recordset);  // Send the query result as JSON
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.get("/getgroupmengineer/:cfranchise_id", async (req, res) => {
  const { cfranchise_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Create the query using string interpolation (be careful to sanitize the input to avoid SQL injection)
    const sql = `SELECT * FROM awt_engineermaster WHERE cfranchise_id = ${pool.request().literal(cfranchise_id)} AND deleted = 0`;

    // Perform the query
    const result = await pool.request().query(sql);

    // Return the result as JSON
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});
//Group Master End

//Start Product List
app.get("/getproductlist", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly use the query (no parameter binding)
    const sql = "SELECT * FROM product_master ORDER BY id ASC";

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result as JSON
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});


//Customer Master Start
app.get("/getcustomer", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Create the query (no parameter binding)
    const sql = `SELECT * FROM awt_customer WHERE deleted = 0`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the first record or an appropriate message if no records are found
    if (result.recordset.length > 0) {
      return res.status(202).json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Customer not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});
app.post("/deletecustomer", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Create the SQL query with string interpolation (no parameter binding)
    const sql = `UPDATE awt_customer SET deleted = 1 WHERE id = ${id}`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if any rows were affected
    if (result.rowsAffected[0] > 0) {
      return res.json({ message: "Customer deleted successfully" });
    } else {
      return res.status(404).json({ message: "Customer not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});
app.get("/requestcustomer", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Construct the SQL query (no parameter binding)
    const sql = `SELECT * FROM awt_customer WHERE deleted = 0 AND id = ${id}`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Check if data was found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Return the first result
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});
app.post("/postcustomer", async (req, res) => {
  const {
    customer_fname,
    customer_lname,
    customer_type,
    customer_classification,
    mobileno,
    alt_mobileno,
    dateofbirth,
    anniversary_date,
    email,
  } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates
    const checkDuplicateSql = `SELECT * FROM awt_customer WHERE mobileno = ${mobileno} AND dateofbirth = '${dateofbirth}' AND deleted = 0`;

    // Execute the duplicate check query
    const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

    // If a duplicate customer is found
    if (checkDuplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Customer with same number and DOB already exists!",
      });
    } else {
      // Insert the customer if no duplicate is found
      const insertSql = `INSERT INTO awt_customer (customer_fname, customer_lname, customer_type, customer_classification, mobileno, alt_mobileno, dateofbirth, anniversary_date, email)
                         VALUES ('${customer_fname}', '${customer_lname}', '${customer_type}', '${customer_classification}', '${mobileno}', '${alt_mobileno}', '${dateofbirth}', '${anniversary_date}', '${email}')`;

      // Execute the insert query
      await pool.request().query(insertSql);

      // Send success response
      return res.status(201).json({
        message: "Customer master added successfully",
      });
    }
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

//Customer Location Start
app.get("/getareadrop/:geocity_id", async (req, res) => {
  const { geocity_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Construct the SQL query (no parameter binding)
    const sql = `SELECT * FROM awt_area WHERE geocity_id = ${geocity_id} AND deleted = 0`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the data
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

app.get("/getpincodedrop/:area_id", async (req, res) => {
  const { area_id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Construct the SQL query (no parameter binding)
    const sql = `SELECT * FROM awt_pincode WHERE area_id = ${area_id} AND deleted = 0`;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

// API to fetch all Customer Location 
app.get("/getcustomerlocation", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Construct the SQL query (no parameter binding)
    const sql = `
        SELECT 
          ccl.*, 
          c.title AS country_title, 
          r.title AS region_title, 
          gs.title AS geostate_title, 
          gc.title AS geocity_title, 
          a.title AS area_title, 
          p.pincode AS pincode_title 
        FROM awt_customerlocation ccl 
        JOIN awt_country c ON ccl.country_id = c.id 
        JOIN awt_region r ON ccl.region_id = r.id 
        JOIN awt_geostate gs ON ccl.geostate_id = gs.id 
        JOIN awt_geocity gc ON ccl.geocity_id = gc.id 
        JOIN awt_area a ON ccl.area_id = a.id 
        JOIN awt_pincode p ON ccl.pincode_id = p.id 
        WHERE ccl.deleted = 0;
      `;

    // Execute the query
    const result = await pool.request().query(sql);

    // Return the result
    return res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred" });
  }
});

// API to fetch a specific Customer Location by ID
app.get("/requestcustomerlocation/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Construct the SQL query (no parameter binding)
    const sql = `SELECT 
                  ccl.*, 
                  c.title as country_title, 
                  r.title as region_title, 
                  gs.title as geostate_title, 
                  gc.title as geocity_title, 
                  a.title as area_title, 
                  p.pincode as pincode_title 
                FROM awt_customerlocation ccl 
                JOIN awt_country c ON ccl.country_id = c.id 
                JOIN awt_region r ON ccl.region_id = r.id 
                JOIN awt_geostate gs ON ccl.geostate_id = gs.id 
                JOIN awt_geocity gc ON ccl.geocity_id = gc.id 
                JOIN awt_area a ON ccl.area_id = a.id 
                JOIN awt_pincode p ON ccl.pincode_id = p.id 
                WHERE ccl.deleted = 0 AND ccl.id = ${id}`;

    // Execute the query
    const result = await pool.request().query(sql);

    // If no data is found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Customer Location not found" });
    }

    // Return the first result as customer location
    return res.status(200).json(result.recordset[0]);

  } catch (err) {
    console.error("Error fetching Customer Location:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

// Insert new Customer Location with duplicate check 
app.post("/postcustomerlocation", async (req, res) => {
  const { country_id, region_id, geostate_id, geocity_id, area_id, pincode_id, address, ccperson, ccnumber, address_type } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates
    const checkDuplicateSql = `SELECT * FROM awt_customerlocation WHERE ccnumber = '${ccnumber}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Customer with same number already exists!",
      });
    } else {
      const insertSql = `INSERT INTO awt_customerlocation (country_id, region_id, geostate_id, geocity_id, area_id, pincode_id, address, ccperson, ccnumber, address_type) 
                         VALUES ('${country_id}', '${region_id}', '${geostate_id}', '${geocity_id}', '${area_id}', '${pincode_id}', '${address}', '${ccperson}', '${ccnumber}', '${address_type}')`;

      await pool.request().query(insertSql);

      return res.json({ message: "Customer Location added successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while adding the customer location' });
  }
});

// Update existing Customer Location with duplicate check 
app.put("/putcustomerlocation", async (req, res) => {
  const {
    country_id, region_id, geostate_id, geocity_id, area_id, pincode_id, address, ccperson, ccnumber, address_type, id
  } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates
    const checkDuplicateSql = `SELECT * FROM awt_customerlocation WHERE ccnumber = '${ccnumber}' AND id != '${id}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Customer with same number already exists!",
      });
    } else {
      const updateSql = `UPDATE awt_customerlocation SET country_id = '${country_id}', region_id = '${region_id}', geostate_id = '${geostate_id}', geocity_id = '${geocity_id}', area_id = '${area_id}', pincode_id = '${pincode_id}', address = '${address}', ccperson = '${ccperson}', ccnumber = '${ccnumber}', address_type = '${address_type}' WHERE id = '${id}'`;

      await pool.request().query(updateSql);

      return res.json({ message: "Customer Location updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while updating the customer location' });
  }
});

// API to soft delete a Customer Location
app.post("/deletepincode", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to update the deleted field to 1
    const sql = `UPDATE awt_customerlocation SET deleted = 1 WHERE id = '${id}'`;

    // Execute the SQL query
    await pool.request().query(sql);

    return res.json({ message: "Customer Location deleted successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error deleting Customer Location" });
  }
});

//Unique Product Master Linked to Location Start
app.get("/getproductunique", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch data from the database
    const sql = "SELECT * FROM awt_uniqueproductmaster WHERE deleted = 0";

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});
app.get("/requestproductunique/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch data from the database
    const sql = `SELECT * FROM awt_uniqueproductmaster WHERE id = '${id}' AND deleted = 0`;

    // Execute the SQL query
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Product not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});
app.post("/postproductunique", async (req, res) => {
  const { product, location, date, serialnumber } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates
    const checkDuplicateSql = `SELECT * FROM awt_uniqueproductmaster WHERE serialnumber = '${serialnumber}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Product with same serial number already exists!",
      });
    } else {
      // Check for soft-deleted products
      const checkSoftDeletedSql = `SELECT * FROM awt_uniqueproductmaster WHERE serialnumber = '${serialnumber}' AND deleted = 1`;
      const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedResult.recordset.length > 0) {
        // Restore soft-deleted product
        const restoreSoftDeletedSql = `UPDATE awt_uniqueproductmaster SET deleted = 0 WHERE serialnumber = '${serialnumber}'`;
        await pool.request().query(restoreSoftDeletedSql);

        return res.json({
          message: "Soft-deleted Product with same serial number restored successfully!",
        });
      } else {
        // Insert new product
        const insertSql = `INSERT INTO awt_uniqueproductmaster (product, location, date, serialnumber) 
                          VALUES ('${product}', '${location}', '${date}', '${serialnumber}')`;
        await pool.request().query(insertSql);

        return res.json({ message: "Product added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});
app.put("/putproductunique", async (req, res) => {
  const { product, id, location, date, serialnumber } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates (excluding the current product)
    const checkDuplicateSql = `SELECT * FROM awt_uniqueproductmaster WHERE serialnumber = '${serialnumber}' AND id != '${id}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Product with same serial number already exists!",
      });
    } else {
      // Update the product if no duplicates are found
      const updateSql = `UPDATE awt_uniqueproductmaster SET product = '${product}', location = '${location}', date = '${date}', serialnumber = '${serialnumber}' WHERE id = '${id}'`;

      await pool.request().query(updateSql);

      return res.json({ message: "Product updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while updating the product' });
  }
});
app.post("/deleteproductunique", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to mark the product as deleted
    const sql = `UPDATE awt_uniqueproductmaster SET deleted = 1 WHERE id = '${id}'`;

    // Execute the SQL query
    await pool.request().query(sql);

    return res.json({ message: "Product deleted successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error deleting product" });
  }
});
//Unique Product Master Linked to Location End

//Start Engineer Master
app.get("/getchildfranchise", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch data from the database
    const sql = "SELECT * FROM awt_childfranchisemaster WHERE deleted = 0";

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});
app.get("/getengineer", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch data from the database with an INNER JOIN
    const sql = `
      SELECT r.*, c.title as childfranchise_title 
      FROM awt_engineermaster r 
      INNER JOIN awt_childfranchisemaster c ON r.cfranchise_id = c.id 
      WHERE r.deleted = 0
    `;

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});
app.get("/requestengineer/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // SQL query to fetch data from the database with the specified ID
    const sql = `SELECT * FROM awt_engineermaster WHERE id = '${id}' AND deleted = 0`;

    // Execute the SQL query
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Engineer not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching the engineer' });
  }
});
app.post("/postengineer", async (req, res) => {
  const { title, cfranchise_id, password, email, mobile_no } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates using direct query injection
    const checkDuplicateSql = `SELECT * FROM awt_engineermaster WHERE mobile_no = '${mobile_no}' AND email = '${email}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Email and mobile_no credentials already exist!",
      });
    } else {
      // Check for soft deleted data
      const checkSoftDeletedSql = `SELECT * FROM awt_engineermaster WHERE mobile_no = '${mobile_no}' AND email = '${email}' AND deleted = 1`;
      const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

      if (softDeletedResult.recordset.length > 0) {
        const restoreSoftDeletedSql = `UPDATE awt_engineermaster SET deleted = 0 WHERE mobile_no = '${mobile_no}' AND email = '${email}'`;
        await pool.request().query(restoreSoftDeletedSql);
        return res.json({
          message: "Soft-deleted Engineer Master restored successfully!",
        });
      } else {
        // Insert new engineer if no duplicate or soft-deleted found
        const insertSql = `INSERT INTO awt_engineermaster (title, cfranchise_id, mobile_no, email, password) 
                           VALUES ('${title}', '${cfranchise_id}', '${mobile_no}', '${email}', '${password}')`;
        await pool.request().query(insertSql);
        return res.json({ message: "Engineer added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while adding the engineer" });
  }
});
app.put("/putengineer", async (req, res) => {
  const { title, id, cfranchise_id, password, email, mobile_no } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates using direct query injection
    const checkDuplicateSql = `SELECT * FROM awt_engineermaster WHERE mobile_no = '${mobile_no}' AND email = '${email}' AND id != '${id}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Email and mobile_no credentials already exist!",
      });
    } else {
      // Update the engineer record if no duplicates are found
      const updateSql = `UPDATE awt_engineermaster 
                         SET title = '${title}', cfranchise_id = '${cfranchise_id}', mobile_no = '${mobile_no}', email = '${email}', password = '${password}' 
                         WHERE id = '${id}'`;

      await pool.request().query(updateSql);
      return res.json({ message: "Engineer updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while updating the engineer" });
  }
});

app.post("/deleteengineer", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly inject `id` into the SQL query (no parameter binding)
    const sql = `UPDATE awt_engineermaster SET deleted = 1 WHERE id = '${id}'`;

    // Execute the SQL query
    await pool.request().query(sql);

    return res.json({ message: "Engineer deleted successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating Engineer" });
  }
});



// End Engineer Master

// Start Franchise Master - Parent
app.get("/getfranchisedata", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM awt_franchisemaster WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching franchise data' });
  }
});
app.get("/requestfranchisedata/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM awt_franchisemaster WHERE id = ${id} AND deleted = 0`);
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching franchise data' });
  }
});

app.post("/postfranchisedata", async (req, res) => {
  const { title } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicate entries in awt_franchisemaster
    const checkDuplicateResult = await pool.request().query(`SELECT * FROM awt_franchisemaster WHERE title = '${title}' AND deleted = 0`);
    if (checkDuplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Franchise Master already exists!",
      });
    }

    // Check for soft deleted entries
    const checkSoftDeletedResult = await pool.request().query(`SELECT * FROM awt_franchisemaster WHERE title = '${title}' AND deleted = 1`);
    if (checkSoftDeletedResult.recordset.length > 0) {
      // Restore soft deleted record
      await pool.request().query(`UPDATE awt_franchisemaster SET deleted = 0 WHERE title = '${title}'`);
      return res.json({
        message: "Soft-deleted Franchise Master restored successfully!",
      });
    } else {
      // Insert new record
      await pool.request().query(`INSERT INTO awt_franchisemaster (title) VALUES ('${title}')`);
      return res.json({
        message: "Franchise Master added successfully!",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

app.put("/putfranchisedata", async (req, res) => {
  const { title, id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicate entries (excluding the current record)
    const checkDuplicateResult = await pool.request().query(`SELECT * FROM awt_franchisemaster WHERE title = '${title}' AND id != '${id}' AND deleted = 0`);
    if (checkDuplicateResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Franchise Master already exists!" });
    }

    // Update the record
    await pool.request().query(`UPDATE awt_franchisemaster SET title = '${title}' WHERE id = '${id}'`);

    return res.json({ message: "Franchise Master updated successfully!" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while updating the Franchise Master' });
  }
});
app.post("/deletefranchisedata", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Perform the update to mark the franchise as deleted
    const result = await pool.request().query(`UPDATE awt_franchisemaster SET deleted = 1 WHERE id = '${id}'`);

    return res.json(result.recordset);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating Franchise Master" });
  }
});


//Start Child Franchise Master
app.get("/getparentfranchise", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly inject the query string without parameters
    const sql = "SELECT * FROM awt_franchisemaster WHERE deleted = 0";

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching parent franchise data" });
  }
});

app.get("/getchildFranchiseDetails", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly inject the query string without parameters
    const sql = `SELECT r.*, m.title as totle FROM awt_childfranchisemaster as r,awt_franchisemaster as m where r.pfranchise_id = m.id And r.deleted = 0`;

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching child franchise data" });
  }
});


app.get("/requestchildfranchise/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Directly inject the `id` into the query string
    const sql = `SELECT * FROM awt_childfranchisemaster WHERE id = '${id}' AND deleted = 0`;

    // Execute the SQL query
    const result = await pool.request().query(sql);

    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching child franchise data" });
  }
});
app.post("/postchildfranchise", async (req, res) => {
  const { title, pfranchise_id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check if the title already exists and is not deleted
    const checkDuplicateSql = `SELECT * FROM awt_childfranchisemaster WHERE title = '${title}' AND deleted = 0`;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Duplicate entry, Child Franchise Master already exists!",
      });
    }

    // Check if the title exists and is soft-deleted
    const checkSoftDeletedSql = `SELECT * FROM awt_childfranchisemaster WHERE title = '${title}' AND deleted = 1`;
    const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

    if (softDeletedResult.recordset.length > 0) {
      const restoreSoftDeletedSql = `UPDATE awt_childfranchisemaster SET deleted = 0 WHERE title = '${title}'`;
      await pool.request().query(restoreSoftDeletedSql);

      return res.json({
        message: "Soft-deleted Child Franchise Master restored successfully!",
      });
    }

    // Insert the new child franchise if no duplicates or soft-deleted records found
    const insertSql = `INSERT INTO awt_childfranchisemaster (title, pfranchise_id) VALUES ('${title}', '${pfranchise_id}')`;
    await pool.request().query(insertSql);

    return res.json({
      message: "Child Franchise Master added successfully!",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});
app.put("/putchildfranchise", (req, res) => {
  const { title, id, pfranchise_id } = req.body;

  // Check for duplicates
  const checkDuplicateSql = `SELECT * FROM awt_childfranchisemaster WHERE title = '${title}' AND id != '${id}' AND deleted = 0`;

  con.query(checkDuplicateSql, (err, data) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (data.length > 0) {
      // If a duplicate exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, Child Franchise already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `UPDATE awt_childfranchisemaster SET title = '${title}', pfranchise_id = '${pfranchise_id}' WHERE id = '${id}'`;

      con.query(updateSql, (err, data) => {
        if (err) {
          return res.status(500).json(err);
        }
        return res.json({ message: "Child Franchise updated successfully!" });
      });
    }
  });
});
app.post("/deletechildfranchise", (req, res) => {
  const { id } = req.body;
  const sql = `UPDATE awt_childfranchisemaster SET deleted = 1 WHERE id = '${id}'`;

  con.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Error updating Child Franchise" });
    } else {
      return res.json(data);
    }
  });
});
// End Child Franchise Master

// ProductType Start
// API to fetch all Product Types that are not soft-deleted
app.get("/getproducttype", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM product_type WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
// Insert for Product Type
app.post("/postdataproducttype", async (req, res) => {
  const { id, product_type, created_by } = req.body;

  try {
    const pool = await poolPromise;

    if (id) {
      // Check for duplicate entries excluding the current ID
      const checkDuplicateSql = `SELECT * FROM product_type WHERE product_type = '${product_type}' AND id != ${id} AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, ProductType already exists!" });
      } else {
        // Update the existing product type
        const updateSql = `UPDATE product_type SET product_type = '${product_type}', updated_date = GETDATE(), updated_by = '${created_by}' WHERE id = ${id}`;
        await pool.request().query(updateSql);
        return res.json({ message: "ProductType updated successfully!" });
      }

    } else {
      // Check for duplicate entries for a new product type
      const checkDuplicateSql = `SELECT * FROM product_type WHERE product_type = '${product_type}' AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, ProductType already exists!" });
      } else {
        // Check for soft-deleted entries with the same product type
        const checkSoftDeletedSql = `SELECT * FROM product_type WHERE product_type = '${product_type}' AND deleted = 1`;
        const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedResult.recordset.length > 0) {
          // Restore the soft-deleted entry
          const restoreSoftDeletedSql = `UPDATE product_type SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' WHERE product_type = '${product_type}'`;
          await pool.request().query(restoreSoftDeletedSql);
          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new product type
          const insertSql = `INSERT INTO product_type (product_type, created_date, created_by) VALUES ('${product_type}', GETDATE(), '${created_by}')`;
          await pool.request().query(insertSql);
          return res.json({ message: "ProductType added successfully!" });
        }
      }
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while processing the request" });
  }
});

// Edit for Product Type
app.get("/requestdataproducttype/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Query to select the product type by id
    const sql = `SELECT * FROM product_type WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    // Return the first record if it exists, otherwise return a 404 error
    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "ProductType not found" });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while fetching product type data" });
  }
});
// Update for Product Type
app.put("/putproducttypedata", async (req, res) => {
  const { id, product_type, updated_by } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicates, excluding the current record's ID
    const checkDuplicateSql = `SELECT * FROM product_type WHERE product_type = '${product_type}' AND deleted = 0 AND id != ${id}`;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, ProductType already exists!" });
    } else {
      // Update the product type
      const updateSql = `UPDATE product_type SET product_type = '${product_type}', updated_by = '${updated_by}', updated_date = GETDATE() WHERE id = ${id} AND deleted = 0`;
      await pool.request().query(updateSql);
      return res.json({ message: "ProductType updated successfully!" });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while updating product type data" });
  }
});
// Delete for Product Type
app.post("/deleteproducttypedata", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Update query to set `deleted` to 1 for the specified id
    const sql = `UPDATE product_type SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json({ message: "ProductType marked as deleted successfully!", data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating product type" });
  }
});
//Product Type End\

//Product Line Start
// API to fetch all product lines that are not soft deleted
app.get("/getproductline", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Query to get all non-deleted product lines
    const sql = `SELECT * FROM product_line WHERE deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while fetching product lines" });
  }
});
// Insert for product line
app.post("/postdataproductline", async (req, res) => {
  const { id, product_line, pline_code, created_by } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    if (id) {
      // Check for duplicate entries excluding the current ID
      const checkDuplicateSql = `SELECT * FROM product_line WHERE product_line = '${product_line}' AND id != ${id} AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Product Line already exists!" });
      } else {
        // Update the existing product line
        const updateSql = `UPDATE product_line SET product_line = '${product_line}', pline_code = '${pline_code}', updated_date = GETDATE(), updated_by = '${created_by}' WHERE id = ${id}`;
        await pool.request().query(updateSql);
        return res.json({ message: "Product Line updated successfully!" });
      }
    } else {
      // Check for duplicate entries for a new product line
      const checkDuplicateSql = `SELECT * FROM product_line WHERE product_line = '${product_line}' AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Product Line already exists!" });
      } else {
        // Check for soft-deleted entries with the same product line
        const checkSoftDeletedSql = `SELECT * FROM product_line WHERE product_line = '${product_line}' AND deleted = 1`;
        const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedResult.recordset.length > 0) {
          // Restore the soft-deleted entry
          const restoreSoftDeletedSql = `UPDATE product_line SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' WHERE product_line = '${product_line}'`;
          await pool.request().query(restoreSoftDeletedSql);
          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new product line
          const insertSql = `INSERT INTO product_line (product_line, pline_code, created_date, created_by) VALUES ('${product_line}', '${pline_code}', GETDATE(), '${created_by}')`;
          await pool.request().query(insertSql);
          return res.json({ message: "Product Line added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while processing the request" });
  }
});
// Edit for product line
app.get("/requestdataproductline/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Query to select the product line by id
    const sql = `SELECT * FROM product_line WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    // Return the first record if it exists, otherwise return a 404 error
    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Product Line not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while fetching product line data" });
  }
});
// Update for product line
app.put("/putproductlinedata", async (req, res) => {
  const { id, product_line, pline_code, updated_by } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Check for duplicate entries excluding the current ID
    const checkDuplicateSql = `SELECT * FROM product_line WHERE product_line = '${product_line}' AND deleted = 0 AND id != ${id}`;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Product Line already exists!" });
    } else {
      // Update the product line
      const updateSql = `UPDATE product_line SET product_line = '${product_line}', pline_code = '${pline_code}', updated_by = '${updated_by}', updated_date = GETDATE() WHERE id = ${id} AND deleted = 0`;
      await pool.request().query(updateSql);
      return res.json({ message: "Product Line updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while updating the product line" });
  }
});
// Delete for product line
app.post("/deleteproductlinedata", async (req, res) => {
  const { id } = req.body;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Update query to set `deleted` to 1 for the specified id
    const sql = `UPDATE product_line SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json({ message: "Product Line marked as deleted successfully!", data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error updating Product Line" });
  }
});
// Product Line End

//Material Start
// API to fetch all materials that are not soft deleted
app.get("/getmat", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Query to get all non-deleted materials
    const sql = `SELECT * FROM material WHERE deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while fetching materials" });
  }
});
// Insert for material
app.post("/postdatamat", async (req, res) => {
  const { id, Material, created_by } = req.body;

  try {
    const pool = await poolPromise;

    if (id) {
      // Check for duplicate materials excluding the current ID
      const checkDuplicateSql = `SELECT * FROM material WHERE material = '${Material}' AND id != ${id} AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Material already exists!" });
      } else {
        // Update the material
        const updateSql = `UPDATE material SET material = '${Material}', updated_date = GETDATE(), updated_by = '${created_by}' WHERE id = ${id}`;
        await pool.request().query(updateSql);
        return res.json({ message: "Material updated successfully!" });
      }
    } else {
      // Check for duplicate materials
      const checkDuplicateSql = `SELECT * FROM material WHERE material = '${Material}' AND deleted = 0`;
      const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

      if (duplicateCheckResult.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Material already exists!" });
      } else {
        // Check if soft-deleted material exists
        const checkSoftDeletedSql = `SELECT * FROM material WHERE material = '${Material}' AND deleted = 1`;
        const softDeletedData = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedData.recordset.length > 0) {
          // Restore soft-deleted material
          const restoreSoftDeletedSql = `UPDATE material SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' WHERE material = '${Material}'`;
          await pool.request().query(restoreSoftDeletedSql);
          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new material
          const insertSql = `INSERT INTO material (material, created_date, created_by) VALUES ('${Material}', GETDATE(), '${created_by}')`;
          await pool.request().query(insertSql);
          return res.json({ message: "Material added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while processing the material data" });
  }
});
// Edit for material
app.get("/requestdatamat/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;

    // Query to get the material by id, ensuring it's not deleted
    const sql = `SELECT * FROM material WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset[0] || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while fetching the material data" });
  }
});
// Update for material
app.put("/putmatdata", async (req, res) => {
  const { id, Material, updated_by } = req.body;

  try {
    const pool = await poolPromise;

    // Check for duplicate materials, excluding the current ID
    const checkDuplicateSql = `SELECT * FROM material WHERE material = '${Material}' AND deleted = 0 AND id != ${id}`;
    const duplicateCheckResult = await pool.request().query(checkDuplicateSql);

    if (duplicateCheckResult.recordset.length > 0) {
      return res
        .status(409)
        .json({ message: "Duplicate entry, Material already exists!" });
    } else {
      // Update the material
      const updateSql = `UPDATE material SET material = '${Material}', updated_by = '${updated_by}', updated_date = GETDATE() WHERE id = ${id} AND deleted = 0`;
      await pool.request().query(updateSql);

      return res.json({ message: "Material updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while updating the material data" });
  }
});
// Delete for material
app.post("/deletematdata", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to mark the material as deleted
    const sql = `UPDATE material SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating Material" });
  }
});
// Material End

//Manufacturer Start
// API to fetch all Manufacturer that are not soft deleted
app.get("/getmanufacturer", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch manufacturers that are not deleted
    const sql = "SELECT * FROM manufacturer WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching manufacturer data" });
  }
});
// Insert for Mnufacturer 
app.post("/postmanufacturer", async (req, res) => {
  const { id, Manufacturer, created_by } = req.body;

  try {
    const pool = await poolPromise;

    // Check if the manufacturer already exists (for both update and insert)
    let sql;
    if (id) {
      sql = `SELECT * FROM manufacturer WHERE Manufacturer = '${Manufacturer}' AND id != ${id} AND deleted = 0`;
      const result = await pool.request().query(sql);

      if (result.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Manufacturer already exists!" });
      } else {
        sql = `UPDATE manufacturer 
               SET Manufacturer = '${Manufacturer}', updated_date = GETDATE(), updated_by = '${created_by}' 
               WHERE id = ${id}`;
        await pool.request().query(sql);
        return res.json({ message: "Manufacturer updated successfully!" });
      }
    } else {
      // Check if the manufacturer exists (for new insert)
      sql = `SELECT * FROM manufacturer WHERE Manufacturer = '${Manufacturer}' AND deleted = 0`;
      const result = await pool.request().query(sql);

      if (result.recordset.length > 0) {
        return res.status(409).json({ message: "Duplicate entry, Manufacturer already exists!" });
      } else {
        // Check if the manufacturer is soft-deleted
        sql = `SELECT * FROM manufacturer WHERE Manufacturer = '${Manufacturer}' AND deleted = 1`;
        const softDeletedData = await pool.request().query(sql);

        if (softDeletedData.recordset.length > 0) {
          sql = `UPDATE manufacturer 
                 SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' 
                 WHERE Manufacturer = '${Manufacturer}'`;
          await pool.request().query(sql);
          return res.json({ message: "Soft-deleted Manufacturer restored successfully!" });
        } else {
          // Insert new manufacturer
          sql = `INSERT INTO manufacturer (Manufacturer, created_date, created_by) 
                 VALUES ('${Manufacturer}', GETDATE(), '${created_by}')`;
          await pool.request().query(sql);
          return res.json({ message: "Manufacturer added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing the manufacturer data" });
  }
});


// Edit for Manufacturer
app.get("/requestmanufacturer/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch manufacturer by id and ensure it is not deleted
    const sql = `SELECT * FROM manufacturer WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Manufacturer not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching manufacturer data" });
  }
});

// Update for Manufacturer
app.put("/putmanufacturer", async (req, res) => {
  const { id, Manufacturer, updated_by } = req.body;

  try {
    const pool = await poolPromise;

    // Check if manufacturer already exists
    let sql = `SELECT * FROM manufacturer WHERE Manufacturer = '${Manufacturer}' AND deleted = 0 AND id != ${id}`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Manufacturer already exists!" });
    } else {
      // Update manufacturer details
      sql = `UPDATE manufacturer 
             SET Manufacturer = '${Manufacturer}', updated_by = '${updated_by}', updated_date = GETDATE() 
             WHERE id = ${id} AND deleted = 0`;
      await pool.request().query(sql);

      return res.json({ message: "Manufacturer updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating manufacturer data" });
  }
});

// Delete for Manufacturer
app.post("/delmanufacturer", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to mark manufacturer as deleted
    const sql = `UPDATE manufacturer SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating Manufacturer" });
  }
});

// Rate Card code start
app.get("/getratedata", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch rate data where deleted is 0
    const sql = "SELECT * FROM rate_card WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching rate data" });
  }
});
// Insert for Ratecard
app.post("/postratedata", async (req, res) => {
  const { Ratecard } = req.body;

  try {
    const pool = await poolPromise;

    // Check if Ratecard already exists
    let sql = `SELECT * FROM rate_card WHERE Ratecard = '${Ratecard}' AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Ratecard already exists!" });
    } else {
      // Check if the Ratecard is soft-deleted
      sql = `SELECT * FROM rate_card WHERE Ratecard = '${Ratecard}' AND deleted = 1`;
      const softDeletedData = await pool.request().query(sql);

      if (softDeletedData.recordset.length > 0) {
        // Restore soft-deleted Ratecard
        sql = `UPDATE rate_card SET deleted = 0 WHERE Ratecard = '${Ratecard}'`;
        await pool.request().query(sql);
        return res.json({ message: "Soft-deleted data restored successfully!" });
      } else {
        // Insert new Ratecard
        sql = `INSERT INTO rate_card (Ratecard) VALUES ('${Ratecard}')`;
        await pool.request().query(sql);
        return res.json({ message: "Ratecard added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing the rate data" });
  }
});
// edit for Ratecard
app.get("/requestratedata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch rate data by id and ensure it is not deleted
    const sql = `SELECT * FROM rate_card WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Ratecard not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching rate data" });
  }
});
// update for Ratecard
app.put("/putratedata", async (req, res) => {
  const { Ratecard, id } = req.body;

  try {
    const pool = await poolPromise;

    // Check if Ratecard already exists
    let sql = `SELECT * FROM rate_card WHERE Ratecard = '${Ratecard}' AND id != ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Ratecard already exists!" });
    } else {
      // Update Ratecard
      sql = `UPDATE rate_card SET Ratecard = '${Ratecard}' WHERE id = ${id}`;
      await pool.request().query(sql);

      return res.json({ message: "Ratecard updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating rate data" });
  }
});
// delete for Ratecard
app.post("/deleteratedata", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to mark rate card as deleted
    const sql = `UPDATE rate_card SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating rate card" });
  }
});

//Rate card code end


// service product code start
app.get("/getprodata", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch service product data where deleted is 0
    const sql = "SELECT * FROM service_product WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching product data" });
  }
});
// Insert for Serviceproduct
app.post("/postprodata", async (req, res) => {
  const { Serviceproduct } = req.body;

  try {
    const pool = await poolPromise;

    // Check if Serviceproduct already exists
    let sql = `SELECT * FROM service_product WHERE Serviceproduct = '${Serviceproduct}' AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Serviceproduct already exists!" });
    } else {
      // Check if the Serviceproduct is soft-deleted
      sql = `SELECT * FROM service_product WHERE Serviceproduct = '${Serviceproduct}' AND deleted = 1`;
      const softDeletedData = await pool.request().query(sql);

      if (softDeletedData.recordset.length > 0) {
        // Restore soft-deleted Serviceproduct
        sql = `UPDATE service_product SET deleted = 0 WHERE Serviceproduct = '${Serviceproduct}'`;
        await pool.request().query(sql);
        return res.json({ message: "Soft-deleted data restored successfully!" });
      } else {
        // Insert new Serviceproduct
        sql = `INSERT INTO service_product (Serviceproduct) VALUES ('${Serviceproduct}')`;
        await pool.request().query(sql);
        return res.json({ message: "Serviceproduct added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing the product data" });
  }
});
// edit for Serviceproduct
app.get("/requestprodata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch service product by id and ensure it is not deleted
    const sql = `SELECT * FROM service_product WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Serviceproduct not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching product data" });
  }
});
// update for Serviceproduct
app.put("/putprodata", async (req, res) => {
  const { Serviceproduct, id } = req.body;

  try {
    const pool = await poolPromise;

    // Check if Serviceproduct already exists (duplicate entry)
    let sql = `SELECT * FROM service_product WHERE Serviceproduct = '${Serviceproduct}' AND id != ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Serviceproduct already exists!" });
    } else {
      // Update the service product
      sql = `UPDATE service_product SET Serviceproduct = '${Serviceproduct}' WHERE id = ${id}`;
      await pool.request().query(sql);

      return res.json({ message: "Serviceproduct updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating the product" });
  }
});
// delete for Serviceproduct
app.post("/deleteprodata", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to mark the product as deleted
    const sql = `UPDATE service_product SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating product" });
  }
});
// Service product end

// Lhi User code start
app.get("/getlhidata", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch lhi_user data where deleted is 0
    const sql = "SELECT * FROM lhi_user WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching LHI data" });
  }
});
// Insert for Lhiuser
app.post("/postlhidata", async (req, res) => {
  const { Lhiuser,
    mobile_no,
    Password,
    UserCode,
    email,
    remarks,
    status,


  } = req.body;



  try {
    const pool = await poolPromise;

    // Step 1: Check if the same Lhiuser exists and is not soft-deleted
    let sql = `SELECT * FROM lhi_user WHERE  Lhiuser = '${Lhiuser}' AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, Lhiuser already exists!" });
    } else {
      // Step 2: Check if the same Lhiuser exists but is soft-deleted
      sql = `SELECT * FROM lhi_user WHERE Lhiuser = '${Lhiuser}' AND deleted = 1`;
      const softDeletedData = await pool.request().query(sql);

      if (softDeletedData.recordset.length > 0) {
        // If soft-deleted data exists, restore the entry
        sql = `UPDATE lhi_user SET deleted = 0 WHERE Lhiuser = '${Lhiuser}'`;
        await pool.request().query(sql);

        return res.json({ message: "Soft-deleted data restored successfully!" });
      } else {
        // Step 3: Insert new entry if no duplicates found
        sql = `INSERT INTO lhi_user (Lhiuser,password,remarks,Usercode,mobile_no,email,status) VALUES ('${Lhiuser}','${Password}','${remarks}','${UserCode}','${mobile_no}','${email}','${status}')`
        await pool.request().query(sql);

        return res.json({ message: "Lhiuser added successfully!" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing the request" });
  }
});
// edit for Lhiuser
app.get("/requestlhidata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch LHI data by id and check for deleted flag
    const sql = `SELECT * FROM lhi_user WHERE id = '${id}' AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "LHI data not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching LHI data" });
  }
});
// update for Lhiuser
app.put("/putlhidata", async (req, res) => {
  const {
    Lhiuser, id, updated_by, mobile_no, Usercode, password, status, email, remarks
  } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Check if the same Lhiuser exists for another record (other than the current one) and is not soft-deleted
    const checkDuplicateSql = `
      SELECT * FROM lhi_user 
      WHERE Lhiuser = '${Lhiuser}' 
      AND id != '${id}' 
      AND deleted = 0
    `;
    const duplicateResult = await pool.request().query(checkDuplicateSql);

    if (duplicateResult.recordset.length > 0) {
      // If a duplicate exists (other than the current record)
      return res.status(409).json({ message: "Duplicate entry, Lhiuser already exists!" });
    } else {
      // Step 2: Update the record if no duplicates are found
      const updateSql = `
        UPDATE lhi_user
        SET 
          Lhiuser = '${Lhiuser}', 
          updated_by = '${updated_by}', 
          updated_date = GETDATE(),
          mobile_no = '${mobile_no}',
          Usercode = '${Usercode}',
          password = '${password}', 
          status = ${status}, 
          email = '${email}', 
          remarks = '${remarks}'
        WHERE id = '${id}'
      `;
      await pool.request().query(updateSql);

      return res.json({ message: "Lhiuser updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating Lhiuser data" });
  }
});


// delete for Lhiuser
app.post("/deletelhidata", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to mark the user as deleted
    const sql = `UPDATE lhi_user SET deleted = 1 WHERE id = '${id}'`;
    await pool.request().query(sql);

    return res.json({ message: "Lhiuser deleted successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating Lhiuser data" });
  }
});

// status api for lhi user
//lhi user code end

// call status code start
app.get("/getcalldata", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch call status records that are not deleted
    const sql = "SELECT * FROM call_status WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching call status data" });
  }
});
// Insert for Callstatus
app.post("/postcalldata", async (req, res) => {
  const { Callstatus } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Check if the same Callstatus exists and is not soft-deleted
    const checkDuplicateSql = `SELECT * FROM call_status WHERE Callstatus = '${Callstatus}' AND deleted = 0`;
    const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

    if (checkDuplicateResult.recordset.length > 0) {
      // If duplicate data exists (not soft-deleted)
      return res.status(409).json({ message: "Duplicate entry, Callstatus already exists!" });
    }

    // Step 2: Check if the same Callstatus exists but is soft-deleted
    const checkSoftDeletedSql = `SELECT * FROM call_status WHERE Callstatus = '${Callstatus}' AND deleted = 1`;
    const checkSoftDeletedResult = await pool.request().query(checkSoftDeletedSql);

    if (checkSoftDeletedResult.recordset.length > 0) {
      // If soft-deleted data exists, restore the entry
      const restoreSoftDeletedSql = `UPDATE call_status SET deleted = 0 WHERE Callstatus = '${Callstatus}'`;
      await pool.request().query(restoreSoftDeletedSql);
      return res.json({ message: "Soft-deleted data restored successfully!" });
    }

    // Step 3: Insert new entry if no duplicates found
    const insertSql = `INSERT INTO call_status (Callstatus) VALUES ('${Callstatus}')`;
    await pool.request().query(insertSql);

    return res.json({ message: "Call status added successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing the request" });
  }
});
// Edit for Callstatus
app.get("/requestcalldata/:id", async (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM call_status WHERE id = '${id}' AND deleted = 0`;

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ message: "Call status not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching data" });
  }
});
// Update for Callstatus
app.put("/putcalldata", async (req, res) => {
  const { Callstatus, id } = req.body;

  const checkDuplicateSql = `SELECT * FROM call_status WHERE Callstatus = '${Callstatus}' AND id != '${id}' AND deleted = 0`;

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(checkDuplicateSql);

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "Duplicate entry, Callstatus already exists!" });
    } else {
      const updateSql = `UPDATE call_status SET Callstatus = '${Callstatus}' WHERE id = '${id}'`;
      await pool.request().query(updateSql);
      return res.json({ message: "Callstatus updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating Callstatus" });
  }
});
// Delete for Callstatus
app.post("/deletecalldata", async (req, res) => {
  const { id } = req.body;
  const sql = `UPDATE call_status SET deleted = 1 WHERE id = '${id}'`;

  try {
    const pool = await poolPromise;
    await pool.request().query(sql);
    return res.json({ message: "Record soft-deleted successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating user" });
  }
});
//call status end

//service agent  code start
// Service agent code
app.get("/getsdata", async (req, res) => {
  try {
    const pool = await poolPromise;

    // SQL query to fetch service agent records that are not deleted
    const sql = "SELECT * FROM service_agent WHERE deleted = 0";
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching service agent data" });
  }
});

// Insert for serviceagent
app.post("/postsdata", async (req, res) => {
  const { id, serviceagent, created_by } = req.body;

  try {
    const pool = await poolPromise;

    if (id) {
      // Step 1: Check if the same serviceagent exists and is not soft-deleted for other IDs
      const checkDuplicateSql = `SELECT * FROM service_agent WHERE serviceagent = '${serviceagent}' AND id != ${id} AND deleted = 0`;
      const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

      if (checkDuplicateResult.recordset.length > 0) {
        // If duplicate data exists for another ID
        return res.status(409).json({ message: "Duplicate entry, serviceagent already exists!" });
      } else {
        // Step 2: Update the entry with the given ID
        const updateSql = `UPDATE service_agent SET serviceagent = '${serviceagent}', updated_date = GETDATE(), updated_by = '${created_by}' WHERE id = ${id}`;
        await pool.request().query(updateSql);
        return res.json({ message: "serviceagent updated successfully!" });
      }
    } else {
      // Step 3: Same logic as before for insert if ID is not provided
      // Check if the same serviceagent exists and is not soft-deleted
      const checkDuplicateSql = `SELECT * FROM service_agent WHERE serviceagent = '${serviceagent}' AND deleted = 0`;
      const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

      if (checkDuplicateResult.recordset.length > 0) {
        // If duplicate data exists (not soft-deleted)
        return res.status(409).json({ message: "Duplicate entry, serviceagent already exists!" });
      } else {
        // Check if the same serviceagent exists but is soft-deleted
        const checkSoftDeletedSql = `SELECT * FROM service_agent WHERE serviceagent = '${serviceagent}' AND deleted = 1`;
        const softDeletedResult = await pool.request().query(checkSoftDeletedSql);

        if (softDeletedResult.recordset.length > 0) {
          // If soft-deleted data exists, restore the entry
          const restoreSoftDeletedSql = `UPDATE service_agent SET deleted = 0, updated_date = GETDATE(), updated_by = '${created_by}' WHERE serviceagent = '${serviceagent}'`;
          await pool.request().query(restoreSoftDeletedSql);
          return res.json({ message: "Soft-deleted data restored successfully!" });
        } else {
          // Insert new entry if no duplicates found
          const insertSql = `INSERT INTO service_agent (serviceagent, created_date, created_by) VALUES ('${serviceagent}', GETDATE(), '${created_by}')`;
          await pool.request().query(insertSql);
          return res.json({ message: "serviceagent added successfully!" });
        }
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing data" });
  }
});

// Edit for serviceagent
app.get("/requestsdata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch service agent record by id that is not deleted
    const sql = `SELECT * FROM service_agent WHERE id = ${id} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]); // Return the first record if found
    } else {
      return res.status(404).json({ message: "Service agent not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching the service agent data" });
  }
});

// Update for serviceagent
app.put("/putsdata", async (req, res) => {
  const { id, serviceagent, updated_by } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Check if the updated serviceagent already exists and is not soft-deleted
    const checkDuplicateSql = `SELECT * FROM service_agent WHERE serviceagent = '${serviceagent}' AND deleted = 0 AND id != ${id}`;
    const checkDuplicateResult = await pool.request().query(checkDuplicateSql);

    if (checkDuplicateResult.recordset.length > 0) {
      // If duplicate data exists
      return res.status(409).json({ message: "Duplicate entry, serviceagent already exists!" });
    } else {
      // Step 2: Update serviceagent data if no duplicates found
      const updateSql = `UPDATE service_agent SET serviceagent = '${serviceagent}', updated_by = '${updated_by}', updated_date = GETDATE() WHERE id = ${id} AND deleted = 0`;
      await pool.request().query(updateSql);
      return res.json({ message: "serviceagent updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while updating the service agent data" });
  }
});
// Delete for serviceagent
app.post("/deletesdata", async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to soft-delete the service agent by setting deleted = 1
    const sql = `UPDATE service_agent SET deleted = 1 WHERE id = ${id}`;
    const result = await pool.request().query(sql);

    return res.json(result); // Return the result from the query
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating user" });
  }
});
//serviceagent end

// Start Complaint View

app.get("/getcomplaintview/:complaintid", async (req, res) => {
  const { complaintid } = req.params;

  try {
    const pool = await poolPromise;

    // SQL query to fetch the complaint_ticket by id that is not deleted
    const sql = `SELECT * FROM complaint_ticket WHERE id = ${complaintid} AND deleted = 0`;
    const result = await pool.request().query(sql);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]); // Return the first record if found
    } else {
      return res.status(404).json({ message: "Complaint not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching the complaint data" });
  }
});

app.post("/addcomplaintremark", async (req, res) => {
  const { ticket_no, note, created_by } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to insert a new complaint remark
    const sql = `INSERT INTO awt_complaintremark (ticket_no, remark, created_by, created_date) 
                    VALUES (${ticket_no}, '${note}', ${created_by}, GETDATE())`;
    const result = await pool.request().query(sql);

    res.json({ insertId: result.rowsAffected[0] }); // Send the inserted ID back to the client
  } catch (err) {
    console.error("Error inserting remark:", err);
    return res.status(500).json({ error: "Database error", details: err.message }); // Send back more details for debugging
  }
});

app.post("/uploadcomplaintattachments", upload.array("attachment"), async (req, res) => {
  const { ticket_no, remark_id, created_by } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  // Combine filenames into a single string
  const attachments = req.files.map((file) => file.filename); // Get all filenames
  const attachmentString = attachments.join(", "); // For a comma-separated string

  try {
    const pool = await poolPromise;

    // SQL query to insert attachments
    const sql = `INSERT INTO awt_complaintattachment (remark_id, ticket_no, attachment, created_by, created_date) 
                    VALUES (${remark_id}, ${ticket_no}, '${attachmentString}', ${created_by}, GETDATE())`;
    const result = await pool.request().query(sql);

    res.json({
      message: "Files uploaded successfully",
      count: 1, // Only one entry created
    });
  } catch (err) {
    console.error("Error inserting attachments:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.get("/getComplaintDetails/:ticket_no", async (req, res) => {
  const ticket_no = req.params.ticket_no;

  try {
    const pool = await poolPromise;

    // Query for remarks
    const remarkQuery = `SELECT ac.*, lu.Lhiuser
                         FROM awt_complaintremark AS ac
                         LEFT JOIN lhi_user AS lu ON lu.id = ac.created_by
                         WHERE ac.ticket_no = '${ticket_no}'`;
    const remarkResult = await pool.request().query(remarkQuery);

    // Query for attachments
    const attachmentQuery = `SELECT * FROM awt_complaintattachment WHERE ticket_no = '${ticket_no}'`;
    const attachmentResult = await pool.request().query(attachmentQuery);

    // Return the results
    res.json({ remarks: remarkResult.recordset, attachments: attachmentResult.recordset });

  } catch (err) {
    console.error("Error fetching complaint details:", err);
    return res.status(500).json({ error: "Error fetching complaint details", details: err.message });
  }
});

app.get("/getComplaintDuplicate/:customer_mobile", async (req, res) => {
  const customer_mobile = req.params.customer_mobile;

  try {
    const pool = await poolPromise;

    // Query to fetch complaint tickets based on customer_mobile
    const sql = `SELECT * FROM complaint_ticket WHERE customer_mobile = '${customer_mobile}' AND deleted = 0 ORDER BY id DESC`;
    const result = await pool.request().query(sql);

    // Send the result back to the client
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching complaint duplicate:", err);
    return res.status(500).json({ error: "Error fetching complaint duplicate", details: err.message });
  }
});
// End Complaint View
// y end

app.get("/product_type", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id , product_type FROM product_type WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
app.get("/fetchproductline", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id , pline_code, product_line FROM product_line WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
app.get("/fetchmaterial", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id ,  Material FROM material WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
app.get("/fetchitemtype", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id , title FROM item_type ");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
app.get("/fetchproductclass", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id , class_code , product_class FROM product_class ");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});
app.get("/fetchmanufacturer", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT id , Manufacturer FROM manufacturer ");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});

app.post("/getupdateparam", async (req, res) => {

  const { productid } = req.body;
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM product_master where id = ${productid}`);


    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching product types' });
  }
});

app.post("/addProduct", async (req, res) => {
  const { item_code, item_description, product_model, product_type, product_class_code, product_class, product_line_code, product_line, material, manufacturer, item_type, serialized, size, crmproducttype, colour, handle_type, serial_identification, installation_type, customer_classification, price_group, mrp, service_partner_basic } = req.body;


  try {
    const pool = await poolPromise;
    // SQL query to insert a new complaint remark
    const sql = `INSERT INTO product_master (serial_no,item_code, item_description, itemCode,product_model,productType,productLineCode,productLine,productClassCode,productClass,material,manufacturer,itemType,serialized,sizeProduct,crm_productType,color,installationType,handleType,customerClassification,price_group,mrp,service_partner_basic)VALUES (@serial_identification,@item_code,@item_description,@item_code,@product_model,@product_type,@product_line_code,@product_line,@product_class_code,@product_class,@material,@manufacturer,@item_type,@serialized,@size,@crmproducttype,@colour,@installation_type,@handle_type,@customer_classification,@price_group,@mrp,@service_partner_basic);`;



    const request = pool.request()
      .input('item_code', item_code)
      .input('item_description', item_description)
      .input('product_model', product_model)
      .input('product_type', product_type)
      .input('product_class_code', product_class_code)
      .input('product_class', product_class)
      .input('product_line_code', product_line_code)
      .input('product_line', product_line)
      .input('material', material)
      .input('manufacturer', manufacturer)
      .input('item_type', item_type)
      .input('serialized', serialized)
      .input('size', size)
      .input('crmproducttype', crmproducttype)
      .input('colour', colour)
      .input('handle_type', handle_type)
      .input('serial_identification', serial_identification)
      .input('installation_type', installation_type)
      .input('customer_classification', customer_classification)
      .input('price_group', price_group)
      .input('mrp', mrp)
      .input('service_partner_basic', service_partner_basic);


    // console.log(sql)

    const result = await request.query(sql);

    res.json({ insertId: result.rowsAffected[0] }); // Send the inserted ID back to the client
  } catch (err) {
    console.error("Error inserting remark:", err);
    return res.status(500).json({ error: "Database error", details: err.message }); // Send back more details for debugging
  }
});

app.post("/updateProduct", async (req, res) => {
  const {
    item_code, item_description, product_model, product_type, product_class_code, product_class,
    product_line_code, product_line, material, manufacturer, item_type, serialized, size,
    crmproducttype, colour, handle_type, serial_identification, installation_type,
    customer_classification, price_group, mrp, service_partner_basic, uid
  } = req.body;

  try {
    const pool = await poolPromise;

    // SQL query to update an existing product
    const sql = `
      UPDATE product_master
      SET
        serial_no = @serial_identification,
        item_code = @item_code,
        item_description = @item_description,
        product_model = @product_model,
        productType = @product_type,
        productLineCode = @product_line_code,
        productLine = @product_line,
        productClassCode = @product_class_code,
        productClass = @product_class,
        material = @material,
        manufacturer = @manufacturer,
        itemType = @item_type,
        serialized = @serialized,
        sizeProduct = @size,
        crm_productType = @crmproducttype,
        color = @colour,
        installationType = @installation_type,
        handleType = @handle_type,
        customerClassification = @customer_classification,
        price_group = @price_group,
        mrp = @mrp,
        service_partner_basic = @service_partner_basic
      WHERE id = @uid;
    `;

    const request = pool.request()
      .input('item_code', item_code)
      .input('item_description', item_description)
      .input('product_model', product_model)
      .input('product_type', product_type)
      .input('product_class_code', product_class_code)
      .input('product_class', product_class)
      .input('product_line_code', product_line_code)
      .input('product_line', product_line)
      .input('material', material)
      .input('manufacturer', manufacturer)
      .input('item_type', item_type)
      .input('serialized', serialized)
      .input('size', size)
      .input('crmproducttype', crmproducttype)
      .input('colour', colour)
      .input('handle_type', handle_type)
      .input('serial_identification', serial_identification)
      .input('installation_type', installation_type)
      .input('customer_classification', customer_classification)
      .input('price_group', price_group)
      .input('mrp', mrp)
      .input('service_partner_basic', service_partner_basic)
      .input('uid', uid); // Adding uid for the WHERE clause

    const result = await request.query(sql);

    res.json({ affectedRows: result.rowsAffected[0] }); // Send the affected rows count back to the client
  } catch (err) {
    console.error("Error updating product:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});
//Complaint view Insert TicketFormData start

app.post("/ticketFormData", async (req, res) => {
  const { ticket_no, serial_no, ModelNumber, engineer_id, call_status, updated_by } = req.body;
  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // console.log(ticket_no, serial_no, ModelNumber, engineer_id, call_status, updated_by, "Values")

  try {
    const pool = await poolPromise;

    const updateSql = `
      UPDATE complaint_ticket 
      SET ModelNumber = '${ModelNumber}', engineer_id = '${engineer_id}', 
          call_status = '${call_status}', serial_no = '${serial_no}' , updated_by = '${updated_by}', updated_date = '${formattedDate}'
      WHERE ticket_no = '${ticket_no}'`;

    // console.log(updateSql, "UpdateSql");
    await pool.request().query(updateSql);

    return res.status(200).json({ message: "Ticket Formdata updated successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred while updating the ticket" });
  }
});

app.post("/updatestatus", async (req, res) => {
  const { dataId } = req.body;
  try {
    const pool = await poolPromise;
    const sql = `SELECT * FROM lhi_user WHERE id = @dataId`;

    // Execute the query to get the user
    const request = await pool.request()
      .input('dataId', dataId)
      .query(sql);

    // Check if records exist
    if (request.recordset.length > 0) {
      const status = request.recordset[0].status;
      // console.log(request.recordset[0].status);
      let query;
      if (status == 1) {
        // If status is 1, deactivate and set activation date
        query = `UPDATE lhi_user 
                 SET status = 0, deactivation_date = GETDATE() 
                 WHERE id = @dataId`;
      } else {
        // If status is not 1, deactivate and set deactivation date
        query = `UPDATE lhi_user 
                 SET status = 1, activation_date = GETDATE() 
                 WHERE id = @dataId`;
      }

      // Execute the update query
      const update = await pool.request()
        .input('dataId', dataId)
        .query(query);

      // Send the response back with rows affected
      return res.json({ status: update.rowsAffected[0] });
    } else {
      // If no user found with the provided dataId
      return res.status(404).json({ message: 'User not found' });
    }

  } catch (err) {
    console.error("Error updating status:", err);
    return res.status(500).json({ message: 'Error updating status' });
  }
});



// Bahvehsh dubey 


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const pool = await poolPromise;



    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password) // Adjust if password is hashed
      .query('SELECT * FROM awt_engineermaster WHERE mobile_no = @username AND password = @password');

    // console.log('SELECT * FROM awt_engineermaster WHERE email = @username AND password = @password')
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(400).json({ message: 'Invalid username or password' });
      console.log(res)
    }
  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

app.get('/getheaddata', async (req, res) => {
  try {
    const pool = await poolPromise;

    const en_id = req.query.en_id;

    const result = await pool.request()
      .query(`SELECT * FROM complaint_ticket WHERE engineer_id = '${en_id}' ORDER BY id DESC`);

    const result1 = await pool.request()
      .query(`SELECT * FROM complaint_ticket where engineer_id = '${en_id}' and call_status in ('Closed', 'Cancelled') order by id DESC `);

    const totalTickets = result.recordset.length || 0;
    const cancleled = result1.recordset.length || 0;
    const pendingTickets = Math.max(totalTickets - cancleled, 0);

    res.status(200).json({
      totalTickets,
      cancleled,
      pendingTickets
    });

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});

app.get('/getcomplaint', async (req, res) => {
  try {
    const pool = await poolPromise;

    const en_id = req.query.en_id;

    const result = await pool.request()
      .query(`SELECT * FROM complaint_ticket WHERE engineer_id = '${en_id}' ORDER BY id DESC`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});

app.get('/SymptomCode', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`select * from symptom_code where deleted = 0`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});
app.get('/CauseCode', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`select * from cause_code where deleted = 0`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});
app.get('/ActionCode', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`select * from action_code where deleted = 0`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});
app.get('/CallType', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`select * from calltype where deleted = 0`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});
app.get('/CallStatus', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`select * from call_status where deleted = 0`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});


app.get('/getcomplaintdetailsdata', async (req, res) => {
  try {
    const pool = await poolPromise;

    const id = req.query.cid;

    const result = await pool.request()
      .query(`SELECT * FROM complaint_ticket WHERE id = '${id}'`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});


app.get('/getremark', async (req, res) => {
  try {
    const pool = await poolPromise;

    const id = req.query.cid;

    const result = await pool.request()
      .query(`SELECT * FROM awt_complaintremark WHERE ticket_no = '${id}'`);

      if (result.recordset.length > 0) {
        res.status(200).json({ data: result.recordset });
      } else {
        res.status(200).json({ Message: 'No records found' });
      }

  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the database query' });
  }
});

// .input('call_remark', sql.VarChar, call_remark)
app.post('/updatecomplaint', async (req, res) => {
  const { actioncode, service_charges, call_remark, call_status, call_type, causecode, other_charge, symptomcode, com_id ,warranty_status} = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('actioncode', sql.VarChar, actioncode)
      .input('symptomcode', sql.VarChar, symptomcode)
      .input('causecode', sql.VarChar, causecode)
      .input('service_charges', sql.VarChar, service_charges)
      .input('call_status', sql.VarChar, call_status)
      .input('call_type', sql.VarChar, call_type)
      .input('other_charge', sql.VarChar, other_charge)
      .input('warranty_status', sql.VarChar, warranty_status)
      .input('com_id', sql.VarChar, com_id)
      .query('UPDATE complaint_ticket SET warranty_status = @warranty_status, symptom_code = @symptomcode, cause_code = @causecode, action_code = @actioncode, service_charges = @service_charges, call_status = @call_status, call_type = @call_type, other_charges = @other_charge WHERE id = @com_id');

    // Check if any rows were updated
    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'Update successful' });
    } else {
      res.status(400).json({ message: 'Failed to update: No rows affected' });
    }
  } catch (error) {
    console.error('Database Query Error:', error);
    res.status(500).json({ message: 'An error occurred during the update' });
  }
});

//Start Complaint List
// Complaint List API with filters
app.get("/getcomplainlist", async (req, res) => {
  try {
    const pool = await poolPromise;
    

    const { fromDate, toDate, customerName, customerEmail, serialNo, productCode, customerMobile } = req.query;

    let sql = "SELECT * FROM complaint_ticket WHERE deleted = 0";
    
    // Add date range filter if both dates are provided
    if (fromDate && toDate) {
      sql += ` AND CAST(ticket_date AS DATE) >= CAST('${fromDate}' AS DATE) 
               AND CAST(ticket_date AS DATE) <= CAST('${toDate}' AS DATE)`;
    }
    
 
    if (customerName) {
      sql += ` AND customer_name LIKE '%${customerName}%'`;
    }
    
    if (customerEmail) {
      sql += ` AND customer_email LIKE '%${customerEmail}%'`;
    }

    if (serialNo) {
      sql += ` AND serial_no LIKE '%${serialNo}%'`;
    }

    if (productCode) {
      sql += ` AND ModelNumber LIKE '%${productCode}%'`;
    }
    
    // Add ordering
    sql += " ORDER BY id DESC";

 console.log(sql,"backend SQL Query")
    const result = await pool.request().query(sql);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while fetching the complaint list" });
  }
});
// end Complaint list

//Register Page Complaint Duplicate Start

app.get("/getComplaintDuplicateRegisterPage/:DuplicateCustomerNumber", async (req, res) => {
  const { DuplicateCustomerNumber } = req.params;

  try {

    if (!DuplicateCustomerNumber) {
      return res.status(400).json({ error: "DuplicateCustomerNumber parameter is required" });
    }

    const pool = await poolPromise;

    const sqlQuery = `
      SELECT * 
      FROM complaint_ticket 
      WHERE customer_mobile = '${DuplicateCustomerNumber}' 
      AND deleted = 0 
      ORDER BY id DESC
    `;


    const result = await pool.request().query(sqlQuery);

   
    if (result.recordset.length === 0) {
      return res.json([]); 
    }

    // Return the records if found
    return res.json(result.recordset);

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error occurred", details: err.message });
  }
});

//Register Page Complaint Duplicate End



