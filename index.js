const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbgbo.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

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
    const doctorsCollection = client.db("healling_hospital").collection("doctor");
  
  const verifyAdmin = async (req, res, next) =>{
    const constractor = req.decoded.email;
      const constractorEmail = await usersCollection.findOne({email: constractor});
      if(constractorEmail.role === 'admin'){
        next()
      }else{
        res.status(403).send({message: 'forbidden'})
      }
  }

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

    app.get('/users', async(req, res) =>{
      const users = await usersCollection.find().toArray();
      res.send(users)
    });
    // Delete User 
    app.delete('/users/:id', verifyJWT, async(req, res) =>{
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/admin/:email', verifyJWT, async(req, res) =>{
      const email = req.params.email;
      const user = await usersCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async(req, res) =>{
      const email = req.params.email;
        const filter = {email: email};
        const updateDoc = {
          $set: {role: 'admin'},
        };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);      
    })

     // create a Booking to insert
    app.post('/booking', async(req, res) =>{
      const booking = req.body;
      const query = {treatment: booking?.treatment, date: booking?.date, patient: booking?.patient, time: booking?.slotTime};
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success: false, booking: exists})
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({success: true, result})
    });

    // GET Packages API
    app.get('/service', async(req, res) =>{
      const cursor = serviceCollection.find({}).project({name: 1, image: 1, service_image: 1});
      const service = await cursor.toArray();
      res.send(service);
      });

    // GET Booking API
    app.get('/booking', verifyJWT , async(req, res) =>{
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      // console.log(patient);
      if(patient === decodedEmail){
        const query = {patient: patient}
        const booking = await bookingCollection.find(query).toArray();
        return res.send(booking);
      }else{
        return res.status(403).send({message: 'Forbidden Access'})
      }
    });
    // POST Doctors
    app.post('/doctor', verifyJWT, verifyAdmin, async(req, res) =>{
      const doctor = req.body;
      const result = await doctorsCollection.insertOne(doctor);
      res.send(result)
    })

  // GET Doctors
  app.get('/doctor', verifyJWT, verifyAdmin, async(req, res) =>{
      const users = await doctorsCollection.find().toArray();
      res.send(users)
    });

    // delete Appointment
    app.delete("/booking/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await bookingCollection.deleteOne(query);
    res.json(result);
  });

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