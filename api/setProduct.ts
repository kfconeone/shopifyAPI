import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import {
  queryOrdersByDateRange,
  getBulkOperationStatus,
  queryAllProducts,
} from "../utils/shopifyAPI";
import axios from "axios";
import * as waiter from "flag-waiter";
import moment = require("moment");

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
  console.log(product);
  await setProducts();

  response.status(200).send("Hello World!");
};

//#region 設定全部產品

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
        result["displayName"] = temp.displayName;
        products[temp.__parentId].variants.push(result);
      } else {
        //是產品
        // result["handle"] = temp.handle;
        result["variants"] = [];
        products[temp.id] = result;
      }
    }

    //4. 存成適合存取的格式, 透過SKU來當id
    let newProducts: any = {};
    Object.values(products).forEach((p: any) => {
      p.variants.forEach((v: any) => {
        newProducts[v.id] = {};
        newProducts[v.id].displayName = v.displayName;
        newProducts[v.id].price = parseInt(v.price);
        newProducts[v.id].vid = v.id.replace(/\:/g, "").replace(/\//g, "");
        newProducts[v.id].sku = v.sku;
        newProducts[v.id].max = 0.5;
      });
    });

    // 將資料寫入FireStore資料庫;
    let productsArr: any[] = Object.values(newProducts);
    const db = admin.firestore();

    for (let i = 0; i < productsArr.length; i++) {
      if (productsArr[i]) {
        await db
          .collection("products")
          .doc(productsArr[i].vid)
          .set(productsArr[i]);
      }
    }

    await db.collection("systems").doc("products").set({
      lastUpdateDatetime: moment().valueOf(),
    });
  }
}

// setProducts();
//#endregion
