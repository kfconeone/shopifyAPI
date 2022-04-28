import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import { IProducts, IOrder, IOrders } from "../interface/base";
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
  try {
    console.log(request.body);
    await setOrders();
  } catch (e) {
    console.log(e);
  }

  response.status(200).send("Hello World!");
};

async function setOrders() {
  // 1. 向Shopify發送請求，取得 BulkOperation ID
  let isCreating = false;
  let operationQuery;
  let startDate = moment(new Date()).add(-1, "d").format("YYYY-MM-DD");
  let endDate = moment(new Date()).add(1, "d").format("YYYY-MM-DD");

  while (!isCreating) {
    operationQuery = await queryOrdersByDateRange(startDate, endDate);
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
    await waiter.WaitMilliseconds(100);
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

    //取得所有的產品, 目的是為了取得KOL在該產品的基本抽成
    const db = admin.firestore();
    let allProducts: any = {};
    let allProductsQuery = await db.collection("products").get();
    allProductsQuery.forEach((doc) => {
      allProducts[doc.id] = doc.data();
    });

    for (let i = 0; i < strArr.length; i++) {
      if (strArr[i] == "") continue;

      let result: any = {};
      let temp = JSON.parse(strArr[i]);
      //有可能會是訂單資料，也有可能是某訂單中購物車資料

      //是購物車資料
      if (temp.__parentId) {
        let tempId = temp.variant.id.replace(/\:/g, "").replace(/\//g, "");
        result["quantity"] = temp.quantity;
        result["sku"] = temp.sku;
        result["title"] = temp.title;
        result["price"] = allProducts[tempId].price;
        orders[temp.__parentId].items[tempId] = result;
      } else {
        //是訂單資料
        result["amount"] = temp.currentTotalPriceSet.shopMoney.amount;
        result["createdAt"] = moment(temp.createdAt).valueOf();
        result["updatedAt"] = moment(temp.updatedAt).valueOf();
        result["customer"] = temp.customer.displayName;
        result["email"] = temp.customer.email;
        result["id"] = temp.id.replace(/\:/g, "").replace(/\//g, "");
        result["fullyPaid"] = temp.fullyPaid;
        result["urlsuffix"] =
          temp.customAttributes.length > 0
            ? temp.customAttributes[0].value
            : "";
        result["name"] = temp.name;
        result["items"] = {};
        orders[temp.id] = result;
      }
    }
    // 將資料寫入FireStore資料庫;
    let ordersArr: any[] = Object.values(orders);
    console.log(ordersArr.length);

    let kols: any = {};

    for (let i = 0; i < ordersArr.length; i++) {
      if (ordersArr[i]) {
        let urlsuffix = ordersArr[i].urlsuffix;

        if (!kols[urlsuffix]) {
          kols[urlsuffix] = await getKolBySuffix(urlsuffix, db);
        }

        let parentUrlsuffix = kols[urlsuffix].parent;
        if (parentUrlsuffix != "") {
          if (!kols[parentUrlsuffix]) {
            kols[parentUrlsuffix] = await getKolBySuffix(parentUrlsuffix, db);
          }
        }

        Object.keys(ordersArr[i].items).forEach((key) => {
          //先取得kol的基本抽成

          // let selfCommission = !allProducts[key].ex[urlsuffix] //如果沒有設定抽成，就用預設的抽成
          //   ? allProducts[key].price * allProducts[key].ex[urlsuffix]
          //   : allProducts[key].price * allProducts[key].default;
          let selfCommission = Math.ceil(
            allProducts[key].price * allProducts[key].default
          );

          //再取得要給予上層的抽成
          let parentCommission =
            parentUrlsuffix != ""
              ? Math.ceil(
                  selfCommission *
                    kols[parentUrlsuffix].downlines[urlsuffix][key]
                )
              : 0;

          ordersArr[i].items[key].selfCommission =
            selfCommission - parentCommission;
          ordersArr[i].items[key].parentCommission = parentCommission;
        });

        // console.log(ordersArr[i]);

        let docId = ordersArr[i].id.replaceAll("/", "").replaceAll(":", "");

        await db.collection("orders").doc(docId).set(ordersArr[i]);
      }
    }
  }
}

async function getKolBySuffix(urlsuffix: string, db: any) {
  let tempQuery = await db
    .collection("members")
    .where("urlsuffix", "==", urlsuffix)
    .get();
  let self = {};
  tempQuery.forEach((doc: any) => {
    self = doc.data();
  });

  return self;
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
    await waiter.WaitMilliseconds(100);
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
        newProducts[v.id].default = 0.8;
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
