import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
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
    if (request.body.withoutdelay == true) {
      await setOrders(true);
    } else {
      await setOrders();
    }
  } catch (e) {
    console.log(e);
  }

  response.status(200).send("Hello World!");
};

//#region 取得所有訂單
async function setOrders(withoutdelay: boolean = false) {
  // 1. 向Shopify發送請求，取得 BulkOperation ID
  let isCreating = false;
  let operationQuery;
  let currentDatetime = moment().valueOf();
  let ordersMeta = null;
  let beginDate = "2022-04-01";
  let endDate = moment(currentDatetime).add(1, "days").format("YYYY-MM-DD");
  let db = admin.firestore();

  ordersMeta = await (
    await db.collection("systems").doc("orders").get()
  ).data();

  if (ordersMeta != null) {
    beginDate = ordersMeta.lastUpdateDatetime;
  }

  console.log(moment(beginDate).format("YYYY-MM-DD HH:mm:ss"));
  console.log(moment(currentDatetime).format("YYYY-MM-DD HH:mm:ss"));
  //check if currentDatetime - beginDate > 1day
  if (!withoutdelay) {
    if (moment(currentDatetime).diff(moment(beginDate), "hours") < 12) return;
  }

  // else beginDate = moment(beginDate).format("YYYY-MM-DD");
  while (!isCreating) {
    operationQuery = await queryOrdersByDateRange(beginDate, endDate);
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
    // console.log(response);
  }

  // 3. 從response中的objectCount取得資料筆數，若筆數大於0，則開始讀取資料並寫入資料庫
  if (response.objectCount > 0) {
    let result = await (await axios.get(response.url)).data;
    let strArr = result.toString().split("\n");
    let orders: any = {};

    //取得所有的產品, 目的是為了取得KOL在該產品的基本抽成

    let allProducts: any = {};
    let allProductsQuery = await db.collection("products").get();
    allProductsQuery.forEach((doc: any) => {
      allProducts[doc.id] = doc.data();
    });

    let allMembers: any = {};
    let allMembersQuery = await db.collection("members").get();
    allMembersQuery.forEach((doc: any) => {
      allMembers[doc.data().urlsuffix] = doc.data();
    });

    let orderPromises = [];

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
        result["amount"] = parseInt(temp.currentTotalPriceSet.shopMoney.amount);
        result["createdAt"] = moment(temp.createdAt).valueOf();
        result["updatedAt"] = moment(temp.updatedAt).valueOf();
        result["customer"] = temp.customer.displayName;
        result["email"] = temp.customer.email;
        result["id"] = temp.id.replace(/\:/g, "").replace(/\//g, "");
        result["fullyPaid"] = temp.fullyPaid;
        temp.customAttributes = temp.customAttributes.filter(
          (item: any) => item.key == "kolsuffix"
        );
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

    for (let i = 0; i < ordersArr.length; i++) {
      let order: any = ordersArr[i];

      let formula =
        order.urlsuffix == "none"
          ? { ADMIN_URL: 1 }
          : getAncestorsCommissionPercentageFormula(
              order.urlsuffix,
              allMembers[order.urlsuffix].ancestors,
              allMembers
            );

      ordersArr[i].totalCommissions = {};
      for (let fkey in formula) {
        ordersArr[i].totalCommissions[fkey] = 0;
      }

      for (let key in order.items) {
        let commissions: any = {};
        for (let fkey in formula) {
          commissions[fkey] = Math.floor(
            allProducts[key].price *
              allProducts[key].max *
              formula[fkey] *
              order.items[key].quantity
          );

          ordersArr[i].totalCommissions[fkey] += commissions[fkey];
        }
        order.items[key].max = allProducts[key].max;
        order.items[key].commissions = commissions;

        console.log(ordersArr[i]);
      }

      orderPromises.push(
        db.collection("orders").doc(ordersArr[i].id).set(ordersArr[i])
      );
    }

    //修改最後更新時間
    orderPromises.push(
      db.collection("systems").doc("orders").set({
        lastUpdateDatetime: currentDatetime,
      })
    );

    try {
      await Promise.all(orderPromises);
    } catch (e) {
      console.log(e);
    }
  }
}

function getAncestorsCommissionPercentageFormula(
  mySuffix: string,
  ancestorSuffixs: string[],
  allMembers: any
) {
  let suffixs: string[] = [...ancestorSuffixs, mySuffix];
  let preprocessedPercentage = [];
  for (let i = 0; i < suffixs.length; i++) {
    preprocessedPercentage.push(allMembers[suffixs[i]].commissionPercentage);
  }

  let preformula = [];
  for (let i = 0; i < preprocessedPercentage.length; i++) {
    if (i < preprocessedPercentage.length - 1) {
      preformula.push(
        parseFloat(
          (preprocessedPercentage[i] - preprocessedPercentage[i + 1]).toFixed(2)
        )
      );
    } else {
      preformula.push(preprocessedPercentage[i]);
    }
  }

  let formula: any = {};
  for (let i = 0; i < preformula.length; i++) {
    formula[suffixs[i]] = preformula[i];
  }

  return formula;
}
