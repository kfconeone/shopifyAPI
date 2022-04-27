import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import { IProduct } from "../interface/base";

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default async (request: VercelRequest, response: VercelResponse) => {
  let product = request.body;
  let results: IProduct[] = [];

  product.variants.forEach((variant: any) => {
    let temp: IProduct = {
      vid: "gid://shopify/ProductVariant/" + variant.id.toString(),
      sku: variant.sku,
      price: parseInt(variant.price),
      handle: product.handle,
    };
    results.push(temp);
  });

  const db = admin.firestore();
  try {
    for (let i = 0; i < results.length; i++) {
      // console.log(result.vid.replace(/\//g, "").replace(":", ""));
      await db
        .collection("products")
        .doc(results[i].vid.replace(/\//g, "").replace(":", ""))
        .set(results[i]);
    }
  } catch (e) {
    console.log(e);
  }

  response.status(200).send("Hello World!");
};
