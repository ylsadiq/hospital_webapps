const express = require('express');
const SSLCommerzPayment = require('sslcommerz')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbgbo.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization;
//   console.log(authHeader);
//   if(!authHeader){
//     return res.status(401).send({message: 'unAuthorized access'})
//   }
//   const token = authHeader.split(' ')[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
//     if(err){
//       return res.status(403).send({message: "Forbidden access"})
//     }
//     req.decoded = decoded;
//     next() // bar
//   });
// }
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'unAuthorized access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message: "Forbidden access"})
    }
    req.decoded = decoded;
    next()
  });
}

async function run() {
  try {
    await client.connect()
    const serviceCollection = client.db("healling_hospital").collection("services");
    const bookingCollection = client.db("healling_hospital").collection("bookings");
    const usersCollection = client.db("healling_hospital").collection("users");


    app.put('/user/:email', async(req, res) =>{
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({result, token});
    })

    app.get('/users', verifyJWT, async(req, res) =>{
      const users = await usersCollection.find().toArray();
      res.send(users)
    });
    app.get('/admin/:email', verifyJWT, async(req, res) =>{
      const email = req.params.email;
      const user = await usersCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })
    app.put('/user/admin/:email', verifyJWT, async(req, res) =>{
      const email = req.params.email;
      const constractor = req.decoded.email;
      const constractorEmail = await usersCollection.findOne({email: constractor});
      if(constractorEmail.role === 'admin'){
        const filter = {email: email};
        const updateDoc = {
          $set: {role: 'admin'},
        };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
      }else{
        res.status(403).send({message: 'forbidden'})
      }
      
    })

     // create a Booking to insert
    app.post('/booking', async(req, res) =>{
      const booking = req.body;
      const query = {treatment: booking?.treatment, date: booking?.date, patient: booking?.patient};
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success: false, booking: exists})
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({success: true, result})
    });

    // // GET Booking API
    // app.get('/booking', async(req, res) =>{
    //   const patient = req.query.patient;
    //   console.log(patient);
    //   const query = {patient: patient};
    //   const bookings = await bookingCollection.find(query).toArray();
    //   res.send(bookings)
    // })
    // GET Packages API
    app.get('/service', async(req, res) =>{
      const cursor = serviceCollection.find({});
      const service = await cursor.toArray();
      res.send(service);
      });

    // GET Booking API
    app.get('/booking', verifyJWT , async(req, res) =>{
      const patient = req.query.patient;
      // const author = req.headers.authorization;
      const decodedEmail = req.decoded.email;

      if(patient === decodedEmail){
        const query = {patient: patient}
        const booking = await bookingCollection.find(query).toArray();
        return res.send(booking);
      }else{
        return res.status(403).send({message: 'Forbidden Access'})
      }
    })

  app.get('/available', async(req, res) =>{
    const date = req.query.date || "Oct 22, 2022";
    const services = await serviceCollection.find().toArray();
    const query = {date: date};
    const bookings = await bookingCollection.find(query).toArray();
    services.forEach(service => {
      const serviceBookings = bookings.filter(b => b.treatment === service?.name)
      // const booked = serviceBookings.map(s => s.slot);
      // service.booked = booked;
     const bookedSlots = serviceBookings.map(s => s.slot);
      const available = service.slots.filter(slot => !bookedSlots.includes(slot));
      service.slots = available

    })
    res.send(services)
  })

  // sslcommerz Payment init

app.get('/init', (req, res) => {
  const data = {
      total_amount: 100,
      currency: 'EUR',
      tran_id: 'REF123',
      success_url: 'http://localhost:5000/success',
      fail_url: 'http://yoursite.com/fail',
      cancel_url: 'http://yoursite.com/cancel',
      ipn_url: 'http://yoursite.com/ipn',
      shipping_method: 'Courier',
      product_name: 'Computer.',
      product_category: 'Electronic',
      product_profile: 'general',
      cus_name: 'Customer Name',
      cus_email: 'cust@yahoo.com',
      cus_add1: 'Dhaka',
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '01711111111',
      ship_name: 'Customer Name',
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
      multi_card_name: 'mastercard',
      value_a: 'ref001_A',
      value_b: 'ref002_B',
      value_c: 'ref003_C',
      value_d: 'ref004_D'
  };
  const sslcommer = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASS, false) //true for live default false for sandbox
  sslcommer.init(data).then(data => {
    res.redirect(data.GatewayPageURL)
      //process the response that got from sslcommerz 
      //https://developer.sslcommerz.com/doc/v4/#returned-parameters
  });
})

app.post('/success', async(req, res) =>{
  console.log(req.body);
  res.status(200).json(req.body)
})

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('welcome healing hospital!')
})

app.listen(port, () => {
  console.log(`healing hospital listening on port ${port}`)
})