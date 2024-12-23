// const express = require('express');
// const cors = require('cors');
// require('dotenv').config()
// const bcrypt = require('bcrypt'); // For hashing passwords
// const Joi = require('joi'); // For validating data
// const app = express();
// const port = process.env.PORT || 5000;

// // Use cors as middleware
// app.use(cors());
// app.use(express.json());




// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://River:redleaf1@cluster0.f2tn7zt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

    
//     app.get('/api/river', async (req, res) => {
//         try {
//           const database = client.db("RiverDB");
//           const collection = database.collection("River");
      
//           // Fetch all items from the River collection
//           const items = await collection.find().toArray();
      
//           // Send the items as the response
//           res.status(200).json(items);
//         } catch (error) {
//           console.error("Error fetching data", error);
//           res.status(500).json({ message: "Error fetching data from the database" });
//         }
//       });




//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);








// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`)
// })
