import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import moment = require("moment");
// import { IProduct } from "../interface/base";

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
  let results: any[] = [];
  product.variants.forEach((variant: any) => {
    let temp: any = {
      vid: ("gid://shopify/ProductVariant/" + variant.id.toString())
        .replace(/\//g, "")
        .replace(":", ""),
      sku: variant.sku,
      price: parseInt(variant.price),
      displayName: product.handle + " - " + variant.option1,
    };
    results.push(temp);
  });

  const db = admin.firestore();
  try {
    let promises: any[] = [];
    for (let i = 0; i < results.length; i++) {
      // console.log(result.vid.replace(/\//g, "").replace(":", ""));
      promises.push(
        db.collection("products").doc(results[i].vid).update(results[i])
      );
    }
    promises.push(
      db.collection("systems").doc("products").set({
        lastUpdatedDatetime: moment().valueOf(),
      })
    );
    await Promise.all(promises);
  } catch (e) {
    console.log(e);
  }

  response.status(200).send("Hello World!");
};
