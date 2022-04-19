import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import { IProduct } from "../interface/base";
import {
  queryOrdersByDateRange,
  getBulkOperationStatus,
  queryAllProducts,
} from "../utils/shopifyAPI";
import axios from "axios";
import * as waiter from "flag-waiter";
import moment from "moment";

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
      price: variant.price,
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

async function setOrders() {
  // 1. 向Shopify發送請求，取得 BulkOperation ID
  let isCreating = false;
  let operationQuery;

  while (!isCreating) {
    operationQuery = await queryOrdersByDateRange("2022-04-01", "2022-04-30");
    await waiter.WaitMilliseconds(300);

    if (
      operationQuery.bulkOperation != null &&
      operationQuery.bulkOperation.status == "CREATED"
    )
      isCreating = true;
    else {
      console.log("Creating error", operationQuery.userErrors);
    }
  }

  // 2. 利用上面的 BulkOperation ID，查詢 BulkOperation 狀態，並等待完成
  let isCompleted = false;
  let response;
  while (!isCompleted) {
    response = await getBulkOperationStatus(operationQuery.bulkOperation.id);
    await waiter.WaitMilliseconds(300);
    if (response.status == "COMPLETED") isCompleted = true;
    else {
      console.log("Not yet Finished or Error");
    }
    console.log(response);
  }

  // 3. 從response中的objectCount取得資料筆數，若筆數大於0，則開始讀取資料並寫入資料庫
  if (response.objectCount > 0) {
    let result = await (await axios.get(response.url)).data;
    let strArr = result.toString().split("\n");
    let orders: any = {};

    console.log(result);
    for (let i = 0; i < strArr.length; i++) {
      if (strArr[i] == "") continue;

      let result: any = {};
      let temp = JSON.parse(strArr[i]);
      //有可能會是訂單資料，也有可能是某訂單中購物車資料

      //是購物車資料
      if (temp.__parentId) {
        console.log(temp);
        result["quantity"] = temp.quantity;
        result["sku"] = temp.sku;
        result["title"] = temp.title;
        result["vid"] = temp.variant.id;
        let tempId = temp.variant.id.replace(/\:/g, "").replace(/\//g, "");
        orders[temp.__parentId].items[tempId] = result;
      } else {
        //是訂單資料
        result["id"] = temp.id;
        result["name"] = temp.name;
        result["fullyPaid"] = temp.fullyPaid;
        result["customer"] = temp.customer.displayName;
        result["email"] = temp.customer.email;
        result["createdAt"] = moment(temp.createdAt).valueOf();
        result["amount"] = temp.currentTotalPriceSet.shopMoney.amount;

        result["kolSuffix"] =
          temp.customAttributes.length > 0
            ? temp.customAttributes[0].value
            : "";
        result["items"] = {};

        orders[temp.id] = result;
      }
    }
    // 將資料寫入FireStore資料庫;
    let ordersArr: any = Object.values(orders);
    const db = admin.firestore();

    for (let i = 0; i < ordersArr.length; i++) {
      if (ordersArr[i]) {
        let tempId = ordersArr[i].id.replaceAll("/", "").replaceAll(":", "");
        await db.collection("orders").doc(tempId).set(ordersArr[i]);
      }
    }
  }
}

async function setProducts() {
  // 1. 向Shopify發送請求，取得 BulkOperation ID
  let isCreating = false;
  let operationQuery;

  while (!isCreating) {
    operationQuery = await queryAllProducts();
    await waiter.WaitMilliseconds(300);

    if (
      operationQuery.bulkOperation != null &&
      operationQuery.bulkOperation.status == "CREATED"
    )
      isCreating = true;
    else {
      console.log("Creating error", operationQuery.userErrors);
    }
  }

  // 2. 利用上面的 BulkOperation ID，查詢 BulkOperation 狀態，並等待完成
  let isCompleted = false;
  let response;
  while (!isCompleted) {
    response = await getBulkOperationStatus(operationQuery.bulkOperation.id);
    await waiter.WaitMilliseconds(300);
    if (response.status == "COMPLETED") isCompleted = true;
    else {
      console.log("Not yet Finished or Error");
    }
    console.log(response);
  }

  // 3. 從response中的objectCount取得資料筆數，若筆數大於0，則開始讀取資料並寫入資料庫
  if (response.objectCount > 0) {
    let result = await (await axios.get(response.url)).data;
    let products: any = {};
    let strArr = result.toString().split("\n");
    console.log(strArr);
    for (let i = 0; i < strArr.length; i++) {
      if (strArr[i] == "") continue;

      let result: any = {};
      let temp = JSON.parse(strArr[i]);
      //有可能會是產品資料和產品內部子項目的資料

      //是子項目
      if (temp.__parentId) {
        result["sku"] = temp.sku;
        result["id"] = temp.id;
        result["price"] = temp.price;
        products[temp.__parentId].variants.push(result);
      } else {
        //是產品
        result["handle"] = temp.handle;
        result["variants"] = [];
        products[temp.id] = result;
      }
    }

    //4. 存成適合存取的格式, 透過SKU來當id
    let newProducts: any = {};
    Object.values(products).forEach((p: any) => {
      p.variants.forEach((v: any) => {
        newProducts[v.id] = {};
        newProducts[v.id].handle = p.handle;
        newProducts[v.id].price = v.price;
        newProducts[v.id].vid = v.id;
        newProducts[v.id].sku = v.sku;
      });
    });

    // 將資料寫入FireStore資料庫;
    let productsArr: any[] = Object.values(newProducts);
    const db = admin.firestore();

    for (let i = 0; i < productsArr.length; i++) {
      if (productsArr[i]) {
        await db
          .collection("products")
          .doc(productsArr[i].vid.replaceAll("/", "").replaceAll(":", ""))
          .set(productsArr[i]);
      }
    }
  }
}
