// Comaplint Module -> Start

// Add Complaint Start
app.post("/add_complaintt", async (req, res) => {
  let {
    complaint_date, customer_name, contact_person, email, mobile, address,
    state, city, area, pincode, mode_of_contact, ticket_type, cust_type,
    warrenty_status, invoice_date, call_charge, cust_id, model, alt_mobile, serial, purchase_date,created_by
  } = req.body;

  const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');


  try {
    const pool = await poolPromise;

  // Split customer_name into customer_fname and customer_lname
  const [customer_fname, ...customer_lnameArr] = customer_name.split(' ');
  const customer_lname = customer_lnameArr.join(' '); // Join the remaining part as last name

  // Insert into awt_customer
  const customerSQL = `
    INSERT INTO awt_customer (customer_fname, customer_lname, email, mobileno, alt_mobileno, created_date, created_by)
    OUTPUT INSERTED.id
    VALUES (@customer_fname, @customer_lname, @email, @mobile, @alt_mobile, @formattedDate, @created_by)`;

    console.log("Executing customer SQL:", customerSQL);  // Debugging log

    const customerResult = await pool.request()
    .input('customer_fname', customer_fname)
    .input('customer_lname', customer_lname)
    .input('email', email)
    .input('mobile', mobile)
    .input('alt_mobile', alt_mobile)
    .input('formattedDate', formattedDate)
    .input('created_by', created_by)
    .query(customerSQL);

    const insertedCustomerId = customerResult.recordset[0].id;
    console.log("Inserted Customer ID:", insertedCustomerId);  // Debugging log

    // Insert into awt_customerlocation using insertedCustomerId as customer_id
    const customerLocationSQL = `
      INSERT INTO awt_customerlocation (
        customer_id, geostate_id, geocity_id, area_id, pincode_id, 
        created_date, created_by, ccperson, ccnumber, address
      )
      VALUES (
        @customer_id, @state, @city, @area, @pincode, 
        @formattedDate, @created_by, @customer_name, @mobile, @address
      )`;

    console.log("Executing customer location SQL:", customerLocationSQL);  // Debugging log

    await pool.request()
      .input('customer_id', insertedCustomerId)
      .input('state', state)
      .input('city', city)
      .input('area', area)
      .input('created_by', created_by)
      .input('pincode', pincode)
      .input('formattedDate', formattedDate)
      .input('customer_name', customer_name)
      .input('mobile', mobile)
      .input('address', address)
      .query(customerLocationSQL);

    // Insert into awt_uniqueproductmaster using insertedCustomerId as customer_id
    const productSQL = `
      INSERT INTO awt_uniqueproductmaster (
        customer_id, product, serialnumber, date, location , created_date, created_by
      )
      VALUES (
        @customer_id, @model, @serial, @purchase_date, @pincode, @formattedDate, @created_by
      )`;

    console.log("Executing product SQL:", productSQL);  // Debugging log

    await pool.request()
      .input('customer_id', insertedCustomerId)
      .input('model', model)
      .input('created_by', created_by)
      .input('serial', serial)
      .input('purchase_date', purchase_date)
      .input('pincode', pincode)
      .input('formattedDate', formattedDate)
      .query(productSQL);

    const checkResult = await pool.request().query(`
      SELECT COUNT(*) AS count FROM complaint_ticket WHERE deleted = 0`);

    const count = checkResult.recordset[0].count + 1;
    const formatDate = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}`;
    const ticket_no = `IG${formatDate}-${count.toString().padStart(4, "0")}`;

    // Insert into complaint_ticket
    const complaintSQL = `
      INSERT INTO complaint_ticket (
        ticket_no, ticket_date, customer_name, customer_mobile, customer_email, address, 
        state, city, area, pincode, customer_id, ModelNumber, ticket_type, call_type, 
        call_status, warranty_status, invoice_date, call_charges, mode_of_contact, 
        contact_person, assigned_to, created_date, created_by, engineer_id, purchase_date, serial_no
      ) 
      VALUES (
        @ticket_no, @complaint_date, @customer_name, @mobile, @email, @address, 
        @state, @city, @area, @pincode, @customer_id, @model, @ticket_type, @cust_type, 
        'Pending', @warrenty_status, @invoice_date, @call_charge, @mode_of_contact, 
        @contact_person, 1, @formattedDate, @created_by, 1, @purchase_date, @serial
      )`;

    console.log("Executing complaint SQL:", complaintSQL);  // Debugging log

    await pool.request()
      .input('ticket_no', ticket_no)
      .input('complaint_date', complaint_date)
      .input('customer_name', customer_name)
      .input('mobile', mobile)
      .input('email', email)
      .input('address', address)
      .input('state', state)
      .input('created_by', created_by)
      .input('city', city)
      .input('area', area)
      .input('pincode', pincode)
      .input('customer_id', insertedCustomerId)
      .input('model', model)
      .input('ticket_type', ticket_type)
      .input('cust_type', cust_type)
      .input('warrenty_status', warrenty_status)
      .input('invoice_date', invoice_date)
      .input('call_charge', call_charge)
      .input('mode_of_contact', mode_of_contact)
      .input('contact_person', contact_person)
      .input('formattedDate', formattedDate)
      .input('purchase_date', purchase_date)
      .input('serial', serial)
      .query(complaintSQL);

    return res.json({ message: 'Complaint added successfully!', ticket_no, insertedCustomerId });
  } catch (err) {
    console.error("Error inserting complaint:", err.stack);
    return res.status(500).json({ error: 'An error occurred while adding the complaint', details: err.message });
  }
});


//Master Service Partner
app.get("/getmasterpartner", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM awt_franchisemaster WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});



//Child Service Partner
app.get("/getchildpartner", async (req, res) => {
  try {
    // Use the poolPromise to get the connection pool
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM awt_childfranchisemaster WHERE deleted = 0");
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});



// S End for Complaint Module