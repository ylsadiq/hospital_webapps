const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbgbo.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect()
    const serviceCollection = client.db("healling_hospital").collection("services");
    const bookingCollection = client.db("healling_hospital").collection("bookings")

     // create a Booking to insert
    app.post('/booking', async(req, res) =>{
      const booking = req.body;
      const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success: false, booking: exists})
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({success: true, result})
    })   
 
    // GET Packages API
    app.get('/service', async(req, res) =>{
      const cursor = serviceCollection.find({});
      const service = await cursor.toArray();
      res.send(service);
      });

    // GET Booking API
    app.get('/booking', async(req, res) =>{
      const cursor = bookingCollection.find({});
      const booking = await cursor.toArray();
      res.send(booking);
      });

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