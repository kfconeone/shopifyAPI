import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default (request: VercelRequest, response: VercelResponse) => {
  let product = request.body;
  let results: any = [];

  product.variants.forEach((variant: any) => {
    let temp = {
      vid: variant.vid,
      sku: variant.sku,
      price: variant.price,
      handle: product.handle,
    };
    results.push(temp);
  });
  console.log(results);
  // const db = admin.firestore();
  // db.collection("products").set()

  response.status(200).send("Hello World!");
};
