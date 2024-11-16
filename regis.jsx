import axios from "axios";
import React, { useEffect, useState } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { Base_Url } from '../../Utils/Base_Url'
import { useNavigate } from "react-router-dom";

export function Registercomplaint(params) {


    const [hideticket, setHideticket] = useState(false)
    const [serachval, setSearch] = useState('')
    const [searchdata, setSearchData] = useState([])
    const [ProductCustomer, setProductCustomer] = useState([])
    const [DuplicateCustomerNumber, setDuplicateCustomerNumber] = useState([])
    const [hasSearched, setHasSearched] = useState(false)
    const [form, setForm] = useState(false)
    const [state, setState] = useState([])
    const [product, setProduct] = useState([])
    const [MasterPartner, setMasterPartner] = useState([])
    const [ChildPartner, setChildPartner] = useState([])
    const [duplicate, setDuplicate] = useState([]);
    const [ticket, setTicket] = useState([])
    
    const created_by = localStorage.getItem("userId"); // Get user ID from localStorage
    const Lhiuser = localStorage.getItem("Lhiuser"); // Get Lhiuser from localStorage

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
    
        return `${day}-${month}-${year}`;
      };

    //setting the values

    const [value, setValue] = useState({
        complaint_date: "",
        customer_name: "",
        contact_person: "",
        email: "",
        mobile: "",
        alt_mobile: "",
        address: "",
        state: "",
        city: "",
        area: "",
        pincode: "",
        mode_of_contact: "",
        ticket_type: "",
        cust_type: "",
        warrenty_status: "",
        invoice_date: "",
        call_charge: "",
        model: "",
        serial: "",
        purchase_date: "",
        master_service_partner: "",
        child_service_partner: "",
        customer_id: "",
        created_by: created_by,
           
    })

    //This is for State Dropdown

    async function getState(params) {
        axios.get(`${Base_Url}/getstate`)
            .then((res) => {
                if (res.data) {

                    setState(res.data)

                }
            })
    }

    //This is for product 

    async function getProduct(params) {

        axios.get(`${Base_Url}/getproduct`)
            .then((res) => {
                if (res.data) {

                    setProduct(res.data)
                }
            })

    }

    //Master Service Partner
    async function getMasterPartner(params) {

        axios.get(`${Base_Url}/getmasterpartner`)
            .then((res) => {
                if (res.data) {

                    setMasterPartner(res.data)
                }
            })

    }

    //Child Service Partner
    async function getChildPartner(params) {

        axios.get(`${Base_Url}/getchildpartner`)
            .then((res) => {
                if (res.data) {

                    setChildPartner(res.data)
                }
            })

    }

    useEffect(() => {
        console.log("DuplicateCustomerNumber",DuplicateCustomerNumber);
        if (DuplicateCustomerNumber) {
            fetchComplaintDuplicate(DuplicateCustomerNumber);
          }
        getState()
        getProduct()
        getMasterPartner() 
        getChildPartner()
    }, [DuplicateCustomerNumber])



    //This function is for search 

    const searchResult = () => {
        setHasSearched(true); // Set that a search has been performed

        axios.post(`${Base_Url}/getticketendcustomer`, { searchparam: serachval })
            .then((res) => {
                console.log(res.data.information)
                if (res.data.information && res.data.information.length > 0) {

                    // console.log(res.data,"Search Data")
                    // console.log(res.data[0],"Hide Ticket")
                    setDuplicateCustomerNumber(res.data.information[0].mobileno);
                    setSearchData(res.data.information[0])
                    setProductCustomer(res.data.product)
      
                    setHideticket(true)
                    // setTicket(res.data)
                    setValue({
                        // complaint_date: res.data[0].ticket_date,
                        // contact_person: res.data[0].customer_mobile,
                        customer_name: res.data.information[0].customer_name,
                        email: res.data.information[0].email,
                        mobile: res.data.information[0].mobileno,
                        address: res.data.information[0].address,
                        customer_id: res.data.information[0].id,
                       

                       
                        // alt_mobile: "",
                        // state: res.data[0].state,
                        // city: res.data[0].city,
                        // area: res.data[0].area,
                        // pincode: res.data[0].pincode,
                        // mode_of_contact: res.data[0].mode_of_contact,
                        // ticket_type: res.data[0].ticket_type,
                        // cust_type: res.data[0].call_type,
                        // warrenty_status: res.data[0].warranty_status,
                        // invoice_date: res.data[0].invoice_date,
                        // call_charge: res.data[0].call_charges,
                        // purchase_date: res.data[0].purchase_date || "", 
                        // serial: res.data[0].serial || "",
                        // master_service_partner: res.data[0].master_service_partner || "",
                        // child_service_partner: res.data[0].child_service_partner || ""
                       
                    })
                   
                 
                } else {
                     // If no results found, clear previous data
                    setSearchData([])
                    setHideticket(false)
                    setTicket([])
                }
            })

    }

    const notify = () => toast.success('Data Submitted..');

    const navigate = useNavigate()


    const handlesubmit = (e) => {
        e.preventDefault()

        const data = {
            complaint_date: value.complaint_date,
            customer_name: value.customer_name,
            contact_person: value.contact_person,
            email: value.email,
            mobile: value.mobile,
            alt_mobile: value.alt_mobile,
            address: value.address,
            state: value.state,
            city: value.city,
            area: value.area,
            pincode: value.pincode,
            mode_of_contact: value.mode_of_contact,
            ticket_type: value.ticket_type,
            cust_type: value.cust_type,
            warrenty_status: value.warrenty_status,
            invoice_date: value.invoice_date,
            call_charge: value.call_charge,
            cust_id: searchdata.customer_id || "",
            model: value.model,
            serial: value.serial,

             // Add new fields to the data object
            purchase_date: value.purchase_date,
            master_service_partner: value.master_service_partner,
            child_service_partner: value.child_service_partner
           

        }

        axios.post(`${Base_Url}/add_complaintt`, data)
            .then((res) => {
                console.log(res.data)

                if (res.data) {

                    notify()

                    setTimeout(() => {
                        navigate('/complaintlist')
                    }, 500);
                }

            })
    }



    const onHandleChange = (e) => {
        setValue((prev) => ({ ...prev, [e.target.name]: e.target.value }));

        // if (name === "master_service_partner"){

        // }
    };

    const fetchComplaintDuplicate = async () => {
        try {
          const response = await axios.get(
            `${Base_Url}/getComplaintDuplicateRegisterPage/${DuplicateCustomerNumber}`
          );
          setDuplicate(response.data);
        } catch (error) {
          console.error("Error fetching complaint details:", error);
        }
      };
    


    return (
        < div className="p-3">
            <div className="row ">
                <div className="complbread">
                    <div className="row">
                        <div className="col-md-3">
                            <label className="breadMain">Register New Complaint</label>
                        </div>
                    </div>
                </div>
            </div>
            <Toaster position="bottom-center"
                reverseOrder={false} />


            <div className="row mt-25">
                <div className="col-3">
                    <div className="card mb-3">
                        <div className="card-body">
                            <div >
                                <p>Search by Mobile / Email</p>
                                <div className="row g-3 align-items-center">
                                    <div className="col-8">
                                        <input required type="text" name="searchtext" id="searchtext" className="form-control" aria-describedby="passwordHelpInline" value={serachval} onChange={(e) => setSearch(e.target.value)} placeholder="Enter Mobile / Email / Customer Name" />
                                    </div>
                                    <div className="col-4">
                                        <button id="inputSearch" name="inputSearch" for="inputSearch" type="submit" className="btn btn-liebherr" onClick={searchResult}>Search</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {hideticket ? <div id="searchResult" className="card">

                        <div className="card-body">

                            <div className="row">
                                <div className="col-md-12">
                                    <h4 className="pname">{searchdata.customer_name}</h4>
                                </div>
                            </div>
                            <p>{searchdata.address}</p>

                            <div className="row mb-3">
                                <div className="col-md-5">
                                    <p className="mp0">M: {searchdata.mobileno}</p>
                                </div>
                            </div>

                            <ul className="nav nav-tabs" id="myTab2" role="tablist">
                                <li className="nav-item">
                                    <a className="nav-link active" id="profile-tab" data-bs-toggle="tab" data-bs-target="#profile" type="button" role="tab" aria-controls="profile" aria-selected="false">Products</a>
                                    
                                </li>
                            </ul>

                            <div className="tab-content mb-3">
                                <div className="tab-pane active" id="profile" role="tabpanel" aria-labelledby="profile-tab">
                                    <table className="table table-striped">
                                        <tbody>
                                            
                                            {ProductCustomer.map((item, index) => (
                                                <tr key={index}>
                                                    <td><div>{item.product}</div></td>
                                                    <td>
                                                        <div className="text-right pb-2">
                                                            <button onClick={() => setForm(true)} className="btn btn-sm btn-primary generateTicket">New Ticket</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                            <ul className="nav nav-tabs" id="myTab" role="tablist">
                                <li className="nav-item">
                                    <a className="nav-link active" id="home-tab" data-bs-toggle="tab" data-bs-target="#home" type="button" role="tab" aria-controls="home" aria-selected="true">Previous Ticket</a>
                                </li>
                            </ul>

                            <div className="tab-content">
                                <div className="tab-pane active" id="home" role="tabpanel" aria-labelledby="home-tab">
                                    <table className="table table-striped">
                                    <tbody>
                                            {duplicate.map((item, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div style={{ fontSize: "14px"}}>{item.ticket_no}</div>
                                                        <span style={{ fontSize: "14px"}}>{formatDate(item.ticket_date)}</span> 
                                                    </td>
                                                    <td style={{ fontSize: "14px"}}>{item.ModelNumber}</td>
                                                    <td>
                                                        <div style={{ fontSize: "14px"}}>{item.call_status}</div>
                                                        <span style={{ fontSize: "14px"}}>View Info</span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>

                                    </table>
                                </div>
                            </div>

                        </div>

                    </div> : <div className="card">
                        <div className="card-body">
                             {/* Only show "No Result Found" if a search was performed and no results were found */}
                                {hasSearched && searchdata.length === 0 && <p>No Result Found</p>}
                                <button onClick={() => setForm(true)} className="btn btn-sm btn-primary">New Ticket</button>
                        </div>
                    </div>}





                </div>
                {form && <>
                    <div className="col-6">
                        <div className="card" id="formInfo">
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        <p style={{ fontSize: "11px", marginBottom: "5px", fontWeight: "bold" }}>Model</p>
                                        <p>{searchdata.ModelNumber}</p>

                                        {searchdata.length == 0 && <div className="">
                                            <select className="form-control" onChange={onHandleChange} value={value.model} name="model">
                                                <option value="">Select</option>
                                                {product.map((item) => {
                                                    return (
                                                        <option value={item.item_description}>{item.item_description}</option>

                                                    )
                                                })}
                                            </select>
                                        </div>}

                                    </div>
                                    <div className="col-md-2">
                                        <p style={{ fontSize: "11px", marginBottom: "5px", fontWeight: "bold" }}>Serial No</p>
                                        <div className="mb-3">
                                            <input 
                                                type="text" 
                                                name="serial"
                                                value={value.serial}
                                                onChange={onHandleChange}
                                                className="form-control" 
                                                placeholder="Enter.." 
                                            />
                                        </div> 
                                        
                                    </div>                                       {/* Add Purchase Date field */}
                                        <div className="col-md-3">
                                            <p style={{ fontSize: "11px", marginBottom: "5px", fontWeight: "bold" }}>Purchase Date</p>
                                            <div className="mb-3">
                                                <input 
                                                    type="date" 
                                                    name="purchase_date"
                                                    onChange={onHandleChange} 
                                                    value={value.purchase_date}
                                                    className="form-control" 
                                                />
                                            </div>
                                        </div>
                                     {/* Add Warranty Status field */}
                                        <div className="col-md-3">
                                            <p style={{ fontSize: "11px", marginBottom: "5px", fontWeight: "bold" }}>Warranty Status</p>
                                            <div className="mb-3">
                                            <select className="form-control" onChange={onHandleChange} value={value.warrenty_status} name="warrenty_status">
                                                <option value="">Select Option</option>
                                                <option value="WARRANTY">IN WARRANTY</option>
                                                <option value="OUT OF WARRANTY">OUT OF WARRANTY</option>
                                            </select>
                                            </div>
                                        </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-12">
                                        <h3 className="mainheade">Complaint <span id="compaintno">: </span></h3>
                                    </div>
                                </div>

                                <form className="row" onSubmit={handlesubmit}>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">Complaint Date</label>
                                            <input type="date" name="complaint_date" onChange={onHandleChange} value={value.complaint_date} className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Customer Name</label>
                                            <input type="text" name="customer_name" onChange={onHandleChange} value={value.customer_name} className="form-control" placeholder="Enter Customer Name" />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Contact Person</label>
                                            <input type="text" className="form-control" name="contact_person" value={value.contact_person} onChange={onHandleChange} placeholder="Enter Contact Person Name" />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Email Id</label>
                                            <input type="email" value={value.email} name="email" onChange={onHandleChange} className="form-control" placeholder="Enter Email Id" />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Mobile No. <input type="checkbox" />Whatsapp</label>
                                            <input type="text" value={value.mobile} name="mobile" onChange={onHandleChange} className="form-control" placeholder="Enter Mobile" />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Alt. Mobile No. <input type="checkbox" />Whatsapp</label>
                                            <input type="text" className="form-control" value={value.alt_mobile} name="alt_mobile" onChange={onHandleChange} placeholder="Enter Mobile" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label htmlFor="exampleFormControlInput1" className="form-label">Address</label>
                                            <textarea className="form-control" value={value.address} name="address" onChange={onHandleChange} placeholder="Enter Address">Customer Address</textarea>
                                        </div>
                                    </div>

                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">State</label>
                                            <select className="form-control" value={value.state} name="state" onChange={onHandleChange}>
                                                <option value="">Select State</option>
                                                {state.map((item) => {
                                                    return (

                                                        <option value={item.id}>{item.title}</option>
                                                    )
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label" >City</label>
                                            <input type="text" className="form-control" value={value.city} name="city" onChange={onHandleChange} />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label" >Area</label>
                                            <input type="text" className="form-control" onChange={onHandleChange} name="area" value={value.area} />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label" >Pincode</label>
                                            <input type="text" className="form-control" value={value.pincode} name="pincode" onChange={onHandleChange} placeholder="Enter Pincode" />
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Mode of Contact</label>
                                            <select className="form-control" onChange={onHandleChange} value={value.mode_of_contact} name="mode_of_contact">
                                                <option value="">Select</option>
                                                <option value="Call">Call</option>
                                                <option value="SMS">SMS</option>
                                                <option value="Email">Email</option>
                                                <option value="In Person">In Person</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Ticket Type</label>
                                            <select className="form-control" onChange={onHandleChange} value={value.ticket_type} name="ticket_type">
                                                <option value="">Select</option>
                                                <option value="BREAKDOWN">BREAKDOWN</option>
                                                <option value="INSTALLATION">INSTALLATION</option>
                                                <option value="Technician">OTHERS</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Customer Type</label>
                                            <select className="form-control" onChange={onHandleChange} value={value.cust_type} name="cust_type">
                                                <option value="">Select </option>
                                                <option value="END CUSTOMER">END CUSTOMER</option>
                                                <option value="DISPLAY/EVENT">DISPLAY / EVENTS</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Warrenty Status</label>
                                            <select className="form-control" onChange={onHandleChange} value={value.warrenty_status} name="warrenty_status">
                                                <option value="">Select </option>
                                                <option value="WARRANTY">Yes</option>
                                                <option value="OUT OF WARRANTY">No</option>
                                            </select>
                                        </div>
                                    </div> */}
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Invoice Date</label>
                                            <input type="date" className="form-control" onChange={onHandleChange} value={value.invoice_date} name="invoice_date" placeholder="" />
                                        </div>
                                    </div>



                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Call Chargeable</label>
                                            <select className="form-control" onChange={onHandleChange} value={value.call_charge} name="call_charge">
                                                <option value="">Select</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                    </div>


                                    <div className="col-md-12">
                                        <button style={{ float: "right" }} className="btn btn-liebherr">Submit</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="col-3">

                        <>
                            <div className="card mb-3" id="productInfo">
                            <div className="card-body">

                                <h4 className="pname">Master Service Partner</h4>
                                <div className="mb-3">
                                    <select 
                                        className="form-control"
                                        name="master_service_partner"
                                        value={value.master_service_partner}
                                        onChange={onHandleChange}
                                    >
                                        <option value="">Select</option>
                                        {MasterPartner.map((partner, index) => (
                                        <option key={index} value={partner.title}>
                                            {partner.title}
                                        </option>
                                        ))}
                                    </select>
                                    </div>


                                <h4 className="pname">Child Service Partner</h4>
                                <div className="mb-3">
                                    <select 
                                        className="form-control"
                                        name="child_service_partner"
                                        value={value.child_service_partner}
                                        onChange={onHandleChange}
                                    >
                                        <option value="">Select</option>
                                        {ChildPartner.map((child, index) => (
                                        <option key={index} value={child.title}>
                                            {child.title}
                                        </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            </div>

                            <div className="card mb-3" id="engineerInfo">
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-8">
                                            <h4 className="pname">Dealer Info</h4>
                                        </div>
                                        <div className="col-md-4 text-right">
                                            <a href="#" style={{ fontSize: '12px' }}>Add New</a>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <select className="form-control" id="exampleFormControlInput1">
                                            <option value="">Select Dealer</option>
                                            <option value="Abhishek Pangerkar">Abhishek Pangerkar</option>
                                            <option value="Amol Jadhav">Amol Jadhav</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="card mb-3" id="engineerInfo">
                                <div className="card-body">
                                    <h4 className="pname">Additional Remarks</h4>
                                    <div className="mb-3">
                                        <textarea className="form-control"></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="card mb-3" id="engineerInfo">
                                <div className="card-body">
                                    <h4 className="pname">Specifivation</h4>
                                    <div className="mb-3">
                                        <textarea className="form-control"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="card" id="attachmentInfo">
                                <div className="card-body">
                                    <h4 className="pname">Attachment</h4>
                                    <div className="mb-3">
                                        <input type="file" className="form-control" id="exampleFormControlInput1" />
                                    </div>
                                    <div id="allattachme">
                                        <table className="table table-striped">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <div>02-06-2024</div>
                                                    </td>
                                                    <td>abc.jpg</td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div>02-06-2024</div>
                                                    </td>
                                                    <td>Liebherr 472L</td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div>02-06-2024</div>
                                                    </td>
                                                    <td>Liebherr 472L</td>
                                                </tr>
                                            </tbody>

                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>

                    </div>
                </>
                }




            </div>



        </div>
    )
}