const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbgbo.mongodb.net/?retryWrites=true&w=majority"`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
      const database = client.db("healling_hospital");
      const serviceCollection = database.collection("services");

    app.get('/service', async(req, res) =>{
      const cursor = serviceCollection.find({});
      const services = await cursor.toArray();
      res.send(services)
    })
    app.post('/service', async(req, res)=>{
      const doc = {
        title: "Record of a Shriveled Datum",
        content: "No bytes, no problem. Just insert a document, in MongoDB",
      }
      const result = await packagesCollection.insertOne(doc)
      res.json(result)
    });
  }
  finally{

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('welcome healing hospital!')
})

app.listen(port, () => {
  console.log(`healing hospital listening on port ${port}`)
})